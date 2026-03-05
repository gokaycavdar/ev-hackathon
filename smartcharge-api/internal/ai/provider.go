package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type Role string

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
)

type Message struct {
	Role    Role   `json:"role"`
	Content string `json:"content"`
}

type Option func(*Options)

type Options struct {
	Temperature float64
	MaxTokens   int
	Model       string
}

type Response struct {
	Content string
	Usage   Usage
	Stop    bool
}

type Usage struct {
	PromptTokens     int
	CompletionTokens int
}

type StreamCallback func(content string, done bool)

type Provider interface {
	Complete(ctx context.Context, messages []Message, opts ...Option) (*Response, error)
	Stream(ctx context.Context, messages []Message, cb StreamCallback, opts ...Option) error
}

func WithTemperature(t float64) Option {
	return func(o *Options) { o.Temperature = t }
}

func WithMaxTokens(n int) Option {
	return func(o *Options) { o.MaxTokens = n }
}

func WithModel(m string) Option {
	return func(o *Options) { o.Model = m }
}

type OllamaProvider struct {
	baseURL string
	model   string
	client  *http.Client
}

func NewOllamaProvider(baseURL, model string) *OllamaProvider {
	return &OllamaProvider{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		model:   model,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

func (p *OllamaProvider) Complete(ctx context.Context, messages []Message, opts ...Option) (*Response, error) {
	options := &Options{
		Model:       p.model,
		Temperature: 0.7,
		MaxTokens:   500,
	}
	for _, opt := range opts {
		opt(options)
	}

	reqBody := map[string]interface{}{
		"model":       options.Model,
		"messages":    toOllamaMessages(messages),
		"temperature": options.Temperature,
		"stream":      false,
	}
	if options.MaxTokens > 0 {
		reqBody["options"] = map[string]interface{}{
			"num_predict": options.MaxTokens,
		}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/api/chat", toJSON(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, &AIError{Code: "API_ERROR", Message: string(body)}
	}

	var ollamaResp map[string]interface{}
	if err := fromJSON(resp.Body, &ollamaResp); err != nil {
		return nil, err
	}

	content := ""
	if msg, ok := ollamaResp["message"].(map[string]interface{}); ok {
		if c, ok := msg["content"].(string); ok {
			content = c
		}
	}

	usage := Usage{}
	if u, ok := ollamaResp["usage"].(map[string]interface{}); ok {
		if pt, ok := u["prompt_tokens"].(float64); ok {
			usage.PromptTokens = int(pt)
		}
		if ct, ok := u["completion_tokens"].(float64); ok {
			usage.CompletionTokens = int(ct)
		}
	}

	return &Response{
		Content: content,
		Usage:   usage,
		Stop:    true,
	}, nil
}

func (p *OllamaProvider) Stream(ctx context.Context, messages []Message, cb StreamCallback, opts ...Option) error {
	options := &Options{
		Model:       p.model,
		Temperature: 0.7,
		MaxTokens:   500,
	}
	for _, opt := range opts {
		opt(options)
	}

	reqBody := map[string]interface{}{
		"model":       options.Model,
		"messages":    toOllamaMessages(messages),
		"temperature": options.Temperature,
		"stream":      true,
	}
	if options.MaxTokens > 0 {
		reqBody["options"] = map[string]interface{}{
			"num_predict": options.MaxTokens,
		}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/api/chat", toJSON(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return &AIError{Code: "API_ERROR", Message: string(body)}
	}

	decoder := json.NewDecoder(resp.Body)
	for {
		var ollamaResp map[string]interface{}
		if err := decoder.Decode(&ollamaResp); err != nil {
			break
		}

		if msg, ok := ollamaResp["message"].(map[string]interface{}); ok {
			if content, ok := msg["content"].(string); ok && content != "" {
				cb(content, false)
			}
		}

		done, _ := ollamaResp["done"].(bool)
		if done {
			cb("", true)
			break
		}
	}

	return nil
}

func toOllamaMessages(msgs []Message) []map[string]string {
	result := make([]map[string]string, len(msgs))
	for i, m := range msgs {
		result[i] = map[string]string{
			"role":    string(m.Role),
			"content": m.Content,
		}
	}
	return result
}

type AIError struct {
	Code    string
	Message string
}

func (e *AIError) Error() string { return e.Message }

func GetEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func toJSON(v interface{}) *bytes.Buffer {
	data, _ := json.Marshal(v)
	return bytes.NewBuffer(data)
}

func fromJSON(r io.Reader, v interface{}) error {
	return json.NewDecoder(r).Decode(v)
}
