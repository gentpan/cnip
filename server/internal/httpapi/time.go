package httpapi

import (
	"context"
	"net/http"
	"time"
)

func timeBoundContext(req *http.Request, timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(req.Context(), timeout)
}
