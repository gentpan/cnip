package sslcheck

import "testing"

func TestNormalizeHost(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "domain", input: "Example.COM", want: "example.com"},
		{name: "scheme", input: "https://example.com/path", want: "example.com"},
		{name: "port", input: "example.com:443", want: "example.com"},
		{name: "localhost", input: "localhost", wantErr: true},
		{name: "private ipv4", input: "192.168.1.1", wantErr: true},
		{name: "loopback ipv6", input: "::1", wantErr: true},
		{name: "userinfo", input: "user@example.com", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeHost(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got host %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("host mismatch: got %q, want %q", got, tt.want)
			}
		})
	}
}
