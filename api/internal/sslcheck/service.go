package sslcheck

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"strings"
	"time"
)

type Result struct {
	Host      string `json:"host"`
	Issuer    string `json:"issuer,omitempty"`
	ValidFrom string `json:"valid_from,omitempty"`
	ValidTo   string `json:"valid_to,omitempty"`
	DaysLeft  int    `json:"days_left"`
	Status    string `json:"status"`
}

type Service struct {
	timeout time.Duration
}

func New(timeout time.Duration) Service {
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	return Service{timeout: timeout}
}

func (s Service) Check(ctx context.Context, rawHost string) (Result, error) {
	host, err := normalizeHost(rawHost)
	if err != nil {
		return Result{}, err
	}

	ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil {
		return Result{}, fmt.Errorf("resolve host: %w", err)
	}
	publicIPs := publicIPs(ips)
	if len(publicIPs) == 0 {
		return Result{}, errors.New("host resolved to a non-public address")
	}

	dialCtx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	var lastErr error
	for _, ip := range publicIPs {
		result, err := s.checkIP(dialCtx, host, ip)
		if err == nil {
			return result, nil
		}
		lastErr = err
	}

	return Result{}, lastErr
}

func (s Service) checkIP(ctx context.Context, host string, ip netip.Addr) (Result, error) {
	dialer := &net.Dialer{Timeout: s.timeout}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(ip.String(), "443"))
	if err != nil {
		return Result{}, fmt.Errorf("connect tls: %w", err)
	}
	defer conn.Close()

	tlsConn := tls.Client(conn, &tls.Config{
		ServerName:         host,
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: false,
	})
	if err := tlsConn.HandshakeContext(ctx); err != nil {
		return Result{}, fmt.Errorf("tls handshake: %w", err)
	}

	state := tlsConn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return Result{}, errors.New("no certificate returned")
	}

	cert := state.PeerCertificates[0]
	now := time.Now().UTC()
	daysLeft := int(cert.NotAfter.Sub(now).Hours() / 24)
	if cert.NotAfter.After(now) && daysLeft < 1 {
		daysLeft = 1
	}

	status := "ok"
	if now.Before(cert.NotBefore) {
		status = "not_yet_valid"
	} else if now.After(cert.NotAfter) {
		status = "expired"
	}

	issuer := cert.Issuer.CommonName
	if issuer == "" {
		issuer = strings.Join(cert.Issuer.Organization, ", ")
	}

	return Result{
		Host:      host,
		Issuer:    issuer,
		ValidFrom: cert.NotBefore.UTC().Format(time.RFC3339),
		ValidTo:   cert.NotAfter.UTC().Format(time.RFC3339),
		DaysLeft:  daysLeft,
		Status:    status,
	}, nil
}

func normalizeHost(rawHost string) (string, error) {
	host := strings.TrimSpace(strings.ToLower(rawHost))
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "http://")
	host = strings.TrimSuffix(host, ".")
	if slash := strings.IndexByte(host, '/'); slash >= 0 {
		host = host[:slash]
	}
	if host == "" {
		return "", errors.New("host is required")
	}
	if strings.Contains(host, "@") {
		return "", errors.New("invalid host")
	}
	if h, p, err := net.SplitHostPort(host); err == nil && p != "" {
		host = h
	}
	host = strings.Trim(host, "[]")
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return "", errors.New("host is not allowed")
	}
	if ip, err := netip.ParseAddr(host); err == nil && !isPublicIP(ip) {
		return "", errors.New("host is not allowed")
	}
	if len(host) > 253 {
		return "", errors.New("host is too long")
	}
	for _, label := range strings.Split(host, ".") {
		if label == "" || len(label) > 63 {
			return "", errors.New("invalid host")
		}
	}
	return host, nil
}

func publicIPs(ips []netip.Addr) []netip.Addr {
	result := make([]netip.Addr, 0, len(ips))
	for _, ip := range ips {
		if isPublicIP(ip) && ip.Is4() {
			result = append(result, ip)
		}
	}
	for _, ip := range ips {
		if isPublicIP(ip) && !ip.Is4() {
			result = append(result, ip)
		}
	}
	return result
}

func isPublicIP(ip netip.Addr) bool {
	return ip.IsValid() &&
		ip.IsGlobalUnicast() &&
		!ip.IsLoopback() &&
		!ip.IsPrivate() &&
		!ip.IsLinkLocalUnicast() &&
		!ip.IsLinkLocalMulticast() &&
		!ip.IsMulticast() &&
		!ip.IsUnspecified()
}
