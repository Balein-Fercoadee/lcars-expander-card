import { handleAction, type ActionConfig, type HomeAssistant, type LovelaceCardConfig } from "custom-card-helpers";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface CardConfig extends LovelaceCardConfig {
  header: LovelaceCardConfig;
  drawer: {
    columns?: number;
    cards: LovelaceCardConfig[];
  };
  default_expanded?: boolean;
  expanded?: boolean;
  hold_action?: ActionConfig;
  header_style?: string | Record<string, string>;
  drawer_style?: string | Record<string, string>;
  card_style?: string | Record<string, string>;
}

interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): HTMLElement;
}

declare global {
  interface Window {
    loadCardHelpers: () => Promise<CardHelpers>;
    customCards?: Array<Record<string, unknown>>;
  }
}

@customElement("lcars-expander-card")
export class LcarsExpanderCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: CardConfig;
  @state() private _expanded = false;
  @state() private _headerCard?: HTMLElement;
  @state() private _drawerCards: HTMLElement[] = [];
  @state() private _loadError?: string;

  private _buildGeneration = 0;
  private _holdTimer?: number;
  private _holdTriggered = false;

  public static getStubConfig(): Partial<CardConfig> {
    return {
      header: { type: "markdown", content: "## Header" },
      drawer: { columns: 2, cards: [] },
      default_expanded: false,
    };
  }

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("A card configuration is required.");
    }
    if (!config.header || typeof config.header !== "object" || !config.header.type) {
      throw new Error("The `header` option must be a Lovelace card configuration.");
    }
    if (!config.drawer || !Array.isArray(config.drawer.cards)) {
      throw new Error("The `drawer` option must include a `cards` array.");
    }
    if (config.drawer.columns !== undefined &&
        (!Number.isInteger(config.drawer.columns) || config.drawer.columns < 1)) {
      throw new Error("The drawer `columns` value must be a positive integer.");
    }
    if (config.default_expanded !== undefined && typeof config.default_expanded !== "boolean") {
      throw new Error("The `default_expanded` option must be a boolean.");
    }
    if (config.expanded !== undefined && typeof config.expanded !== "boolean") {
      throw new Error("The `expanded` option must be a boolean.");
    }

    this._config = config;
    this._expanded = config.default_expanded ?? config.expanded ?? false;
    void this._createCards(config);
  }

  public getCardSize(): number {
    return this._expanded ? Math.max(2, this._drawerCards.length + 1) : 1;
  }

  protected updated(): void {
    this._syncChildCards();
  }

  private async _createCards(config: CardConfig): Promise<void> {
    const generation = ++this._buildGeneration;
    this._loadError = undefined;

    try {
      const helpers = await window.loadCardHelpers();
      const headerCard = helpers.createCardElement(config.header);
      const drawerCards = config.drawer.cards.map((card) => helpers.createCardElement(card));

      if (generation !== this._buildGeneration) return;
      this._headerCard = headerCard;
      this._drawerCards = drawerCards;
      this._applyStyles();
    } catch (error) {
      if (generation !== this._buildGeneration) return;
      console.error("Unable to create cards for lcars-expander-card.", error);
      this._loadError = error instanceof Error ? error.message : String(error);
      this._headerCard = undefined;
      this._drawerCards = [];
    }
  }

  private _syncChildCards(): void {
    if (this.hass) {
      if (this._headerCard) (this._headerCard as HTMLElement & { hass: HomeAssistant }).hass = this.hass;
      for (const card of this._drawerCards) {
        (card as HTMLElement & { hass: HomeAssistant }).hass = this.hass;
      }
    }
    this._applyStyles();
  }

  private _applyStyles(): void {
    if (!this._config) return;
    if (this._headerCard) {
      this._headerCard.style.cssText = this._styleText(this._config.header_style);
    }
    for (const card of this._drawerCards) {
      card.style.cssText = this._styleText(this._config.card_style);
    }
  }

  private _styleText(style?: string | Record<string, string>): string {
    if (!style) return "";
    if (typeof style === "string") return style;
    return Object.entries(style)
      .map(([name, value]) => `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value}`)
      .join("; ");
  }

  private _handleHeaderPointerDown(event: PointerEvent): void {
    if (!this._config?.hold_action || event.button !== 0) return;
    window.clearTimeout(this._holdTimer);
    this._holdTriggered = false;
    this._holdTimer = window.setTimeout(() => {
      this._holdTriggered = true;
      if (this.hass && this._config) {
        handleAction(this, this.hass, { hold_action: this._config.hold_action }, "hold");
      }
    }, 500);
  }

  private _handleHeaderPointerEnd(): void {
    window.clearTimeout(this._holdTimer);
  }

  private _handleHeaderClick(): void {
    if (this._holdTriggered) {
      this._holdTriggered = false;
      return;
    }
    this._expanded = !this._expanded;
  }

  private _handleHeaderKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this._handleHeaderClick();
    }
  }

  protected render() {
    const columns = this._config?.drawer.columns ?? 2;
    const drawerStyle = this._config?.drawer_style;
    return html`
      <ha-card>
        <div
          class="header"
          role="button"
          tabindex="0"
          aria-expanded=${this._expanded ? "true" : "false"}
          @click=${this._handleHeaderClick}
          @pointerdown=${this._handleHeaderPointerDown}
          @pointerup=${this._handleHeaderPointerEnd}
          @pointercancel=${this._handleHeaderPointerEnd}
          @keydown=${this._handleHeaderKeydown}
        >
          ${this._headerCard ?? nothing}
        </div>
        <div
          class="drawer-shell"
          ?data-expanded=${this._expanded}
          aria-hidden=${this._expanded ? "false" : "true"}
          ?inert=${!this._expanded}
        >
          <div class="drawer-content" style=${this._styleText(drawerStyle)}>
            ${this._loadError
              ? html`<div class="error" role="alert">Unable to load cards: ${this._loadError}</div>`
              : html`
                <div class="grid" style=${`--columns: ${columns}`}>
                  ${this._drawerCards.map((card) => html`<div class="drawer-card">${card}</div>`)}
                </div>
              `}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-card {
      overflow: hidden;
    }

    .header {
      cursor: pointer;
      outline: none;
    }

    .header:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }

    .drawer-shell {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 280ms ease;
    }

    .drawer-shell[data-expanded] {
      grid-template-rows: 1fr;
    }

    .drawer-content {
      min-height: 0;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 220ms ease, transform 280ms ease;
    }

    .drawer-shell[data-expanded] .drawer-content {
      opacity: 1;
      transform: translateY(0);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
      gap: var(--lcars-expander-card-gap, 8px);
      padding: var(--lcars-expander-card-padding, 8px);
    }

    .drawer-card {
      min-width: 0;
    }

    .error {
      padding: 12px;
      color: var(--error-color, #db4437);
    }

    @media (prefers-reduced-motion: reduce) {
      .drawer-shell,
      .drawer-content {
        transition-duration: 0.01ms;
      }
    }
  `;
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "lcars-expander-card",
  name: "LCARS Expander Card",
  description: "A collapsible card drawer with a configurable header and grid.",
});
