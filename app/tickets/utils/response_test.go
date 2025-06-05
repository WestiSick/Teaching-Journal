package utils

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestTicketsRespondWithJSON(t *testing.T) {
    rr := httptest.NewRecorder()
    payload := map[string]string{"hello": "world"}
    RespondWithJSON(rr, http.StatusCreated, payload)
    if rr.Code != http.StatusCreated {
        t.Fatalf("expected status %d got %d", http.StatusCreated, rr.Code)
    }
    if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
        t.Fatalf("expected content-type application/json got %s", ct)
    }
    var out map[string]string
    if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
        t.Fatalf("unmarshal error: %v", err)
    }
    if out["hello"] != "world" {
        t.Fatalf("unexpected body: %v", out)
    }
}

func TestTicketsRespondWithError(t *testing.T) {
    rr := httptest.NewRecorder()
    RespondWithError(rr, http.StatusBadRequest, "err")
    var resp Response
    if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
        t.Fatalf("unmarshal error: %v", err)
    }
    if resp.Success || resp.Error != "err" {
        t.Fatalf("unexpected response: %+v", resp)
    }
}

func TestTicketsRespondWithSuccess(t *testing.T) {
    rr := httptest.NewRecorder()
    data := map[string]string{"v": "1"}
    RespondWithSuccess(rr, http.StatusOK, "m", data)
    var resp Response
    if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
        t.Fatalf("unmarshal error: %v", err)
    }
    if !resp.Success || resp.Message != "m" {
        t.Fatalf("unexpected response: %+v", resp)
    }
    m, ok := resp.Data.(map[string]interface{})
    if !ok || m["v"] != "1" {
        t.Fatalf("unexpected data: %v", resp.Data)
    }
}
