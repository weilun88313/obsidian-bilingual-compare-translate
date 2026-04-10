import {
  App,
  Notice,
  PluginSettingTab,
  SecretComponent,
  Setting,
} from "obsidian";
import type BilingualCompareTranslatePlugin from "../main";
import { getProviderDefaults } from "../settings";
import { translateBlock } from "../translation/translateBlock";
import type { ApiProvider } from "../types";

export class BilingualTranslateSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: BilingualCompareTranslatePlugin
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const providerDefaults = getProviderDefaults(this.plugin.settings.apiProvider);

    containerEl.empty();

    new Setting(containerEl)
      .setName("Toggle current note translation pane")
      .setDesc("Keeps the current note editable and shows a native-looking live translation pane beside it.")
      .addButton((button) =>
        button.setButtonText("Toggle pane").setCta().onClick(() => {
          void this.plugin.toggleInlinePaneForActiveView();
        })
      );

    new Setting(containerEl)
      .setName("API provider")
      .setDesc("Choose the provider used for the live translated preview.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("openai", "OpenAI-compatible")
          .addOption("gemini", "Gemini")
          .addOption("anthropic", "Anthropic messages")
          .addOption("mymemory", "MyMemory")
          .setValue(this.plugin.settings.apiProvider)
          .onChange(async (value) => {
            const provider = value as ApiProvider;
            const defaults = getProviderDefaults(provider);

            this.plugin.settings.apiProvider = provider;
            this.plugin.settings.apiUrl = defaults.apiUrl;
            this.plugin.settings.model = defaults.model;
            if (provider === "mymemory" && this.plugin.settings.sourceLanguage === "auto") {
              this.plugin.settings.sourceLanguage = "en";
            }
            if (provider === "mymemory" && this.plugin.settings.targetLanguage === "Chinese") {
              this.plugin.settings.targetLanguage = "zh-CN";
            }
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName("API URL")
      .setDesc("Full translation endpoint URL.")
      .addText((text) =>
        text
          .setPlaceholder(providerDefaults.apiUrl)
          .setValue(this.plugin.settings.apiUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.apiProvider !== "mymemory") {
      new Setting(containerEl)
        .setName("API key or secret name")
        .setDesc("Paste a raw API key here, or enter a stored secret name.")
        .addComponent((componentEl) =>
          new SecretComponent(this.app, componentEl)
            .setValue(this.plugin.settings.apiKeySecretName)
            .onChange(async (value) => {
              this.plugin.settings.apiKeySecretName = value;
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.apiProvider !== "mymemory") {
      new Setting(containerEl)
        .setName("Model name")
        .setDesc("Model name or deployment ID.")
        .addText((text) =>
          text
            .setPlaceholder(providerDefaults.model)
            .setValue(this.plugin.settings.model)
            .onChange(async (value) => {
              this.plugin.settings.model = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    if (this.plugin.settings.apiProvider === "anthropic") {
      new Setting(containerEl)
        .setName("Anthropic version")
        .setDesc("Default official version is 2023-06-01.")
        .addText((text) =>
          text
            .setPlaceholder("2023-06-01")
            .setValue(this.plugin.settings.anthropicVersion)
            .onChange(async (value) => {
              this.plugin.settings.anthropicVersion = value.trim() || "2023-06-01";
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Authentication header name")
        .setDesc("For official Anthropic, this is x-api-key. Your proxy may use another name.")
        .addText((text) =>
          text
            .setPlaceholder("x-api-key")
            .setValue(this.plugin.settings.anthropicAuthHeaderName)
            .onChange(async (value) => {
              this.plugin.settings.anthropicAuthHeaderName = value.trim() || "x-api-key";
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Maximum tokens")
        .setDesc("Maximum output tokens for the Anthropic messages request.")
        .addText((text) =>
          text
            .setPlaceholder("1024")
            .setValue(String(this.plugin.settings.maxTokens))
            .onChange(async (value) => {
              const parsed = Number.parseInt(value, 10);
              if (!Number.isNaN(parsed) && parsed >= 1) {
                this.plugin.settings.maxTokens = parsed;
                await this.plugin.saveSettings();
              }
            })
        );
    }

    new Setting(containerEl)
      .setName("Source language")
      .setDesc(
        this.plugin.settings.apiProvider === "mymemory"
          ? "Use an explicit code like en, zh-CN, ja."
          : "Use auto if the source language should be inferred by the model."
      )
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.settings.apiProvider === "mymemory" ? "en" : "auto")
          .setValue(this.plugin.settings.sourceLanguage)
          .onChange(async (value) => {
            this.plugin.settings.sourceLanguage =
              value.trim() || (this.plugin.settings.apiProvider === "mymemory" ? "en" : "auto");
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Target language")
      .setDesc(
        this.plugin.settings.apiProvider === "mymemory"
          ? "Use an explicit code like zh-CN, en, ja."
          : "Language shown in the translation column."
      )
      .addText((text) =>
        text
          .setPlaceholder(this.plugin.settings.apiProvider === "mymemory" ? "zh-CN" : "Chinese")
          .setValue(this.plugin.settings.targetLanguage)
          .onChange(async (value) => {
            this.plugin.settings.targetLanguage =
              value.trim() ||
              (this.plugin.settings.apiProvider === "mymemory" ? "zh-CN" : "Chinese");
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.apiProvider === "mymemory") {
      new Setting(containerEl)
        .setName("Contact email")
        .setDesc("Optional. MyMemory says a valid email increases the daily quota.")
        .addText((text) =>
          text
            .setPlaceholder("you@example.com")
            .setValue(this.plugin.settings.mymemoryContactEmail)
            .onChange(async (value) => {
              this.plugin.settings.mymemoryContactEmail = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Temperature")
      .setDesc(
        this.plugin.settings.apiProvider === "mymemory"
          ? "Unused by MyMemory, kept for compatibility with the other providers."
          : "Lower values are recommended for translation consistency."
      )
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.temperature)
          .onChange(async (value) => {
            this.plugin.settings.temperature = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Concurrency")
      .setDesc(
        this.plugin.settings.apiProvider === "mymemory"
          ? "How many short MyMemory requests to run in parallel."
          : "How many blocks to translate in parallel."
      )
      .addText((text) =>
        text
          .setPlaceholder("2")
          .setValue(String(this.plugin.settings.concurrency))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isNaN(parsed) && parsed >= 1) {
              this.plugin.settings.concurrency = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Test connection")
      .setDesc("Send a single short translation request with the current settings.")
      .addButton((button) =>
        button.setButtonText("Test").onClick(async () => {
          button.setDisabled(true);
          button.setButtonText("Testing...");

          try {
            const result = await translateBlock(
              "Hello world",
              this.plugin.settings,
              (name) => this.app.secretStorage.getSecret(name) ?? undefined
            );
            new Notice(`Connection successful: ${result}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`Connection failed: ${message}`);
          } finally {
            button.setDisabled(false);
            button.setButtonText("Test");
          }
        })
      );
  }
}
