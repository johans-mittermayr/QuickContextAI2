export async function fetchExplanation(prompt, apiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that explains content simply." },
          { role: "user", content: `Explain this: ${prompt}` }
        ]
      })
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch explanation.");
    }
  
    const result = await response.json();
    return result.choices[0].message.content;
  }