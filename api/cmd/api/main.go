package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ip2region.io/api/internal/config"
	"ip2region.io/api/internal/httpapi"
	"ip2region.io/api/internal/iplookup"
	"ip2region.io/api/internal/updater"
)

func main() {
	config.LoadEnvFiles(".env", "../.env")
	cfg := config.Load()

	lookupService, err := iplookup.NewService(cfg)
	if err != nil {
		log.Fatalf("init lookup service: %v", err)
	}
	defer lookupService.Close()

	updateManager := updater.NewManager(cfg, lookupService)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if cfg.UpdateEnabled {
		go updateManager.Run(ctx)
	}

	server := &http.Server{
		Addr:              cfg.ListenAddr(),
		Handler:           httpapi.NewRouter(cfg, lookupService, updateManager),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on %s", cfg.ListenAddr())
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}

	log.Println("server stopped")
	os.Exit(0)
}
