interface AnthropicContentPart {
  type?: string;
  text?: string;
}

interface AnthropicResponse {
  content?: string | AnthropicContentPart[];
}

export function extractAnthropicText(payload: AnthropicResponse): string {
  if (typeof payload.content === "string") {
    return payload.content;
  }

  if (Array.isArray(payload.content)) {
    const textParts = payload.content
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text!.trim())
      .filter(Boolean);

    if (textParts.length) {
      return textParts.join("\n\n");
    }
  }

  throw new Error("Anthropic response did not include translated text.");
}
