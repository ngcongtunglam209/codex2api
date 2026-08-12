package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/codex2api/auth"
	"github.com/codex2api/cache"
	"github.com/codex2api/database"
	"github.com/gin-gonic/gin"
)

func TestSanitizePublicPricingConfig(t *testing.T) {
	tests := []struct {
		name      string
		raw       string
		wantErr   bool
		wantRows  int
		checkFunc func(t *testing.T, cfg publicPricingConfig)
	}{
		{name: "empty", raw: "   ", wantRows: 0},
		{name: "invalid json", raw: "{not json", wantErr: true},
		{
			name:     "drops rows without a model name",
			raw:      `{"enabled":true,"rows":[{"model":"gpt-5.5","input":1.25,"output":10},{"model":"  ","input":1}]}`,
			wantRows: 1,
		},
		{
			name: "clamps negative prices and absurd rate instead of failing",
			raw:  `{"enabled":true,"usd_to_vnd":99999999,"rows":[{"model":"m","input":-5,"cached_input":-1,"output":1e9}]}`,
			checkFunc: func(t *testing.T, cfg publicPricingConfig) {
				if cfg.Rows[0].Input != 0 || cfg.Rows[0].CachedInput != 0 {
					t.Fatalf("negative prices not clamped: %+v", cfg.Rows[0])
				}
				if cfg.Rows[0].Output != publicPricingMaxPriceUSD {
					t.Fatalf("output = %v, want clamp to %v", cfg.Rows[0].Output, float64(publicPricingMaxPriceUSD))
				}
				if cfg.USDToVND != publicPricingMaxVNDPerUSD {
					t.Fatalf("usd_to_vnd = %v, want clamp to %v", cfg.USDToVND, float64(publicPricingMaxVNDPerUSD))
				}
			},
			wantRows: 1,
		},
		{
			name: "keeps only known note locales",
			raw:  `{"enabled":true,"note":{"vi":"chuyển khoản","xx":"junk"},"rows":[{"model":"m","input":1,"output":2}]}`,
			checkFunc: func(t *testing.T, cfg publicPricingConfig) {
				if cfg.Note["vi"] != "chuyển khoản" {
					t.Fatalf("vi note lost: %+v", cfg.Note)
				}
				if _, ok := cfg.Note["xx"]; ok {
					t.Fatalf("unknown locale kept: %+v", cfg.Note)
				}
			},
			wantRows: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			normalized, err := sanitizePublicPricingConfig(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatal("want error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("sanitizePublicPricingConfig: %v", err)
			}
			if got := publicPricingRowCount(normalized); got != tt.wantRows {
				t.Fatalf("rows = %d, want %d (json=%s)", got, tt.wantRows, normalized)
			}
			if tt.checkFunc != nil {
				var cfg publicPricingConfig
				if err := json.Unmarshal([]byte(normalized), &cfg); err != nil {
					t.Fatalf("unmarshal normalized: %v", err)
				}
				tt.checkFunc(t, cfg)
			}
		})
	}
}

// 价目表未启用 / 没有行 / 公开主页被关闭时，/api/pricing 一律 404——
// 空价目页对客户毫无意义。
func TestGetPublicPricingGating(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db := newTestAdminDB(t)
	tc := cache.NewMemory(1)
	defer tc.Close()
	store := auth.NewStore(db, tc, nil)
	handler := NewHandler(store, db, tc, nil, "admin-secret")

	ctx := context.Background()
	writeSettings := func(t *testing.T, homeEnabled bool, pricingJSON string) {
		t.Helper()
		settings, err := db.GetSystemSettings(ctx)
		if err != nil {
			t.Fatalf("GetSystemSettings: %v", err)
		}
		if settings == nil {
			settings = &database.SystemSettings{}
		}
		settings.PublicHomePageEnabled = homeEnabled
		settings.PublicPricingConfig = pricingJSON
		if err := db.UpdateSystemSettings(ctx, settings); err != nil {
			t.Fatalf("UpdateSystemSettings: %v", err)
		}
	}

	router := gin.New()
	router.GET("/api/pricing", handler.GetPublicPricing)

	filled := `{"enabled":true,"usd_to_vnd":26000,"rows":[{"model":"gpt-5.5","input":1.25,"cached_input":0.125,"output":10}]}`

	tests := []struct {
		name        string
		homeEnabled bool
		pricing     string
		wantStatus  int
	}{
		{name: "published", homeEnabled: true, pricing: filled, wantStatus: http.StatusOK},
		{name: "pricing disabled", homeEnabled: true, pricing: `{"enabled":false,"rows":[{"model":"m","input":1,"output":2}]}`, wantStatus: http.StatusNotFound},
		{name: "no rows", homeEnabled: true, pricing: `{"enabled":true,"rows":[]}`, wantStatus: http.StatusNotFound},
		{name: "public site off", homeEnabled: false, pricing: filled, wantStatus: http.StatusNotFound},
		{name: "corrupt json falls back to empty", homeEnabled: true, pricing: "{broken", wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			writeSettings(t, tt.homeEnabled, tt.pricing)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/pricing", nil))
			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body=%s", recorder.Code, tt.wantStatus, recorder.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				var cfg publicPricingConfig
				if err := json.Unmarshal(recorder.Body.Bytes(), &cfg); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				if len(cfg.Rows) != 1 || cfg.Rows[0].Model != "gpt-5.5" || cfg.USDToVND != 26000 {
					t.Fatalf("unexpected payload: %+v", cfg)
				}
			}
		})
	}
}
