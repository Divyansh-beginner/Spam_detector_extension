// mockApi.js
export function mockFetch(_url, _options) {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve([
          { label: "LABEL_1", score: Math.random().toFixed(4) },
          { label: "LABEL_0", score: (1 - Math.random()).toFixed(4) }
        ])
      }), 500 + Math.random() * 1000); // Simulate delay
    });
  }