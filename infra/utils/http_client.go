package utils

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"
)

var httpClient = &http.Client{Timeout: 5 * time.Second}

// PostJSON sends a POST request with JSON body to the specified URL
func PostJSON(url string, body interface{}) (*http.Response, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	return httpClient.Do(req)
}
