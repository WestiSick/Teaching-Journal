package utils

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestScheduleRespondWithJSON(t *testing.T) {
    rr := httptest.NewRecorder()
    payload := map[string]string{"ok": "yes"}
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
    if out["ok"] != "yes" {
        t.Fatalf("unexpected body: %v", out)
    }
}

func TestScheduleRespondWithError(t *testing.T) {
    rr := httptest.NewRecorder()
    RespondWithError(rr, http.StatusBadRequest, "fail")
    var resp Response
    if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
        t.Fatalf("unmarshal error: %v", err)
    }
    if resp.Success || resp.Error != "fail" {
        t.Fatalf("unexpected response: %+v", resp)
    }
}

func TestScheduleRespondWithSuccess(t *testing.T) {
    rr := httptest.NewRecorder()
    data := map[string]int{"id": 1}
    RespondWithSuccess(rr, http.StatusOK, "ok", data)
    var resp Response
    if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
        t.Fatalf("unmarshal error: %v", err)
    }
    if !resp.Success || resp.Message != "ok" {
        t.Fatalf("unexpected response: %+v", resp)
    }
    m, ok := resp.Data.(map[string]interface{})
    if !ok || int(m["id"].(float64)) != 1 {
        t.Fatalf("unexpected data: %v", resp.Data)
    }
}
