package admin

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/codex2api/database"
	"github.com/gin-gonic/gin"
)

// 公开价目表：管理员手填的对外售价（USD / 1M token），与 /admin/model-pricing 的
// 上游成本价完全分开——成本价用于用量结算，这里只用于对外报价页。
const (
	publicPricingMaxRows      = 200
	publicPricingMaxModelLen  = 120
	publicPricingMaxNoteLen   = 500
	publicPricingMaxBadgeLen  = 24
	publicPricingMaxPriceUSD  = 100000 // 单价上限，挡住误填成天文数字
	publicPricingMaxVNDPerUSD = 1000000
)

type publicPricingRow struct {
	Model       string  `json:"model"`
	Input       float64 `json:"input"`
	CachedInput float64 `json:"cached_input"`
	Output      float64 `json:"output"`
	Badge       string  `json:"badge,omitempty"`
	Note        string  `json:"note,omitempty"`
}

type publicPricingConfig struct {
	Enabled  bool               `json:"enabled"`
	USDToVND float64            `json:"usd_to_vnd"`
	Note     map[string]string  `json:"note,omitempty"`
	Rows     []publicPricingRow `json:"rows"`
}

// sanitizePublicPricingConfig 校验并归一管理员提交的价目表，返回可直接入库的 JSON。
// 只有结构性错误才拒绝（JSON 解析失败、行数超限）；数值越界一律夹紧，这样管理员
// 少填一个 0 不会让整页保存失败。
func sanitizePublicPricingConfig(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "{}", nil
	}
	var cfg publicPricingConfig
	if err := json.Unmarshal([]byte(trimmed), &cfg); err != nil {
		return "", fmt.Errorf("invalid JSON: %w", err)
	}
	if len(cfg.Rows) > publicPricingMaxRows {
		return "", errors.New("too many rows")
	}

	cfg.USDToVND = clampPricingFloat(cfg.USDToVND, 0, publicPricingMaxVNDPerUSD)
	if len(cfg.Note) > 0 {
		note := make(map[string]string, len(cfg.Note))
		for _, locale := range []string{"vi", "en", "zh"} {
			if value := strings.TrimSpace(cfg.Note[locale]); value != "" {
				note[locale] = truncateRunes(value, publicPricingMaxNoteLen)
			}
		}
		cfg.Note = note
	}

	rows := make([]publicPricingRow, 0, len(cfg.Rows))
	for _, row := range cfg.Rows {
		model := truncateRunes(strings.TrimSpace(row.Model), publicPricingMaxModelLen)
		if model == "" {
			// 没有模型名的行是编辑器里的空行，丢掉而不是报错。
			continue
		}
		rows = append(rows, publicPricingRow{
			Model:       model,
			Input:       clampPricingFloat(row.Input, 0, publicPricingMaxPriceUSD),
			CachedInput: clampPricingFloat(row.CachedInput, 0, publicPricingMaxPriceUSD),
			Output:      clampPricingFloat(row.Output, 0, publicPricingMaxPriceUSD),
			Badge:       truncateRunes(strings.TrimSpace(row.Badge), publicPricingMaxBadgeLen),
			Note:        truncateRunes(strings.TrimSpace(row.Note), publicPricingMaxNoteLen),
		})
	}
	cfg.Rows = rows

	encoded, err := json.Marshal(cfg)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func publicPricingRowCount(normalized string) int {
	var cfg publicPricingConfig
	if err := json.Unmarshal([]byte(normalized), &cfg); err != nil {
		return 0
	}
	return len(cfg.Rows)
}

// clampPricingFloat 与 account_analysis.go 的 clampFloat 分开命名，避免同包重名。
func clampPricingFloat(value, min, max float64) float64 {
	if value != value { // NaN
		return min
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func truncateRunes(value string, max int) string {
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}

// GetPublicPricing 对外提供价目表。公开主页开关关闭、价目表未启用，或还没有任何一行
// 报价时统一 404——没有价格的价目页对客户毫无意义，不如让路由不存在。
func (h *Handler) GetPublicPricing(c *gin.Context) {
	if h == nil || h.db == nil {
		c.Status(http.StatusNotFound)
		return
	}
	siteEnabled, err := h.PublicHomePageEnabled(c.Request.Context())
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	if !siteEnabled {
		c.Status(http.StatusNotFound)
		return
	}
	settings, err := h.db.GetSystemSettings(c.Request.Context())
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	if settings == nil {
		c.Status(http.StatusNotFound)
		return
	}
	var cfg publicPricingConfig
	if err := json.Unmarshal([]byte(database.NormalizePublicPricingConfigJSON(settings.PublicPricingConfig)), &cfg); err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	if !cfg.Enabled || len(cfg.Rows) == 0 {
		c.Status(http.StatusNotFound)
		return
	}
	c.JSON(http.StatusOK, cfg)
}
