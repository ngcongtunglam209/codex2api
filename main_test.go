package main

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gin-gonic/gin"
)

func TestConfigureTrustedProxiesRejectsForwardedForSpoofing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	if err := configureTrustedProxies(r, nil); err != nil {
		t.Fatalf("configureTrustedProxies() error = %v", err)
	}
	r.GET("/client-ip", func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/client-ip", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("X-Forwarded-For", "127.0.0.1")
	req.Header.Set("X-Real-IP", "127.0.0.1")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if got := strings.TrimSpace(w.Body.String()); got != "203.0.113.10" {
		t.Fatalf("ClientIP() = %q, want remote addr and not spoofed loopback", got)
	}
}

func TestConfigureTrustedProxiesHonorsTrustedProxyList(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	if err := configureTrustedProxies(r, []string{"10.0.0.0/8", "192.168.1.1"}); err != nil {
		t.Fatalf("configureTrustedProxies() error = %v", err)
	}
	r.GET("/client-ip", func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/client-ip", nil)
	req.RemoteAddr = "10.1.2.3:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.7")
	r.ServeHTTP(w, req)
	if got := strings.TrimSpace(w.Body.String()); got != "198.51.100.7" {
		t.Fatalf("trusted proxy ClientIP() = %q, want forwarded client 198.51.100.7", got)
	}

	w = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/client-ip", nil)
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.7")
	r.ServeHTTP(w, req)
	if got := strings.TrimSpace(w.Body.String()); got != "203.0.113.10" {
		t.Fatalf("untrusted source ClientIP() = %q, want remote addr 203.0.113.10", got)
	}
}

func TestConfigureTrustedProxiesRejectsInvalidEntry(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	if err := configureTrustedProxies(r, []string{"not-an-ip"}); err == nil {
		t.Fatal("configureTrustedProxies() error = nil, want error for invalid proxy entry")
	}
}

func TestConfigureTrustedProxiesAllowsLoopbackWAF(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	if err := configureTrustedProxies(r, []string{"127.0.0.1", "::1"}); err != nil {
		t.Fatalf("configureTrustedProxies() error = %v", err)
	}
	r.GET("/client-ip", func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/client-ip", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "203.0.113.42")
	req.Header.Set("X-Real-IP", "127.0.0.1")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if got := strings.TrimSpace(w.Body.String()); got != "203.0.113.42" {
		t.Fatalf("ClientIP() = %q, want forwarded client IP from trusted loopback proxy", got)
	}
}

func TestConfigureTrustedProxiesAllowsDockerWAF(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	if err := configureTrustedProxies(r, []string{"127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"}); err != nil {
		t.Fatalf("configureTrustedProxies() error = %v", err)
	}
	r.GET("/client-ip", func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/client-ip", nil)
	req.RemoteAddr = "172.18.0.2:12345"
	req.Header.Set("X-Forwarded-For", "203.0.113.42")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusOK)
	}
	if got := strings.TrimSpace(w.Body.String()); got != "203.0.113.42" {
		t.Fatalf("ClientIP() = %q, want forwarded client IP from trusted Docker proxy", got)
	}
}

func TestLoggerMiddlewareRedactsSensitiveContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var logs bytes.Buffer
	previousOutput := log.Writer()
	previousFlags := log.Flags()
	log.SetOutput(&logs)
	log.SetFlags(0)
	t.Cleanup(func() {
		log.SetOutput(previousOutput)
		log.SetFlags(previousFlags)
	})

	r := gin.New()
	r.Use(loggerMiddleware())
	r.GET("/probe", func(c *gin.Context) {
		c.Set("x-account-email", "alice@example.com")
		c.Set("x-account-proxy", "http://user:secret@proxy.example:8080")
		c.Set("x-model", "gpt-5.5")
		c.Set("x-reasoning-effort", "medium")
		c.Set("x-service-tier", "fast")
		c.Status(http.StatusAccepted)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/probe", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusAccepted)
	}

	got := logs.String()
	for _, forbidden := range []string{"alice@example.com", "secret"} {
		if strings.Contains(got, forbidden) {
			t.Fatalf("log output leaked %q: %s", forbidden, got)
		}
	}
	for _, expected := range []string{"GET /probe 202", "gpt-5.5", "effort=medium", "fast"} {
		if !strings.Contains(got, expected) {
			t.Fatalf("log output missing %q: %s", expected, got)
		}
	}
}

// 回归：前端构建产物曾挂在 /admin/ 下，保护 /admin 的网关（Cloudflare Access 等）
// 会连带拦掉公开主页的 JS，导致白屏。产物改挂根目录，且不得回退成 index.html。
func TestBuildAssetHandlerServesAssetsOutsideAdminPrefix(t *testing.T) {
	gin.SetMode(gin.TestMode)

	const bundle = "console.log('ok')"
	subFS := fstest.MapFS{
		"index.html":             {Data: []byte("<!doctype html><div id=root></div>")},
		"favicon.png":            {Data: []byte("\x89PNG")},
		"assets/index-abc123.js": {Data: []byte(bundle)},
	}

	r := gin.New()
	h := newBuildAssetHandler(subFS, http.FS(subFS))
	r.GET("/assets/*filepath", h)
	r.GET("/favicon.png", h)

	tests := []struct {
		name     string
		path     string
		wantCode int
		wantBody string
	}{
		{name: "asset served from root", path: "/assets/index-abc123.js", wantCode: http.StatusOK, wantBody: bundle},
		{name: "favicon served from root", path: "/favicon.png", wantCode: http.StatusOK, wantBody: "\x89PNG"},
		{name: "missing asset 404s instead of SPA fallback", path: "/assets/gone-000000.js", wantCode: http.StatusNotFound},
		{name: "directory is not served", path: "/assets/", wantCode: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tt.path, nil))

			if w.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantCode)
			}
			if tt.wantBody != "" && w.Body.String() != tt.wantBody {
				t.Fatalf("body = %q, want %q", w.Body.String(), tt.wantBody)
			}
			if tt.wantCode == http.StatusNotFound && strings.Contains(w.Body.String(), "<!doctype html") {
				t.Fatalf("missing asset fell back to index.html: %s", w.Body.String())
			}
		})
	}
}
