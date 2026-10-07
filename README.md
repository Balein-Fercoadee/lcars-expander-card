# LCARS Expander Card

A Home Assistant Lovelace custom card with an arbitrary card as its clickable
header and a collapsible grid of cards below it. The drawer is collapsed by
default and animates upward when closed and downward when opened.

## Install

Build the card with `npm install` followed by `npm run build`. Copy
`dist/lcars-expander-card.js` into Home Assistant's `/config/www/` directory,
then add it as a JavaScript module resource, for example:

```yaml
url: /local/lcars-expander-card.js
type: module
```

## Configuration

```yaml
type: custom:lcars-expander-card
header:
  type: custom:your-header-card
  # Any options supported by the header card
drawer:
  columns: 3
  cards:
    - type: custom:your-card
    - type: entities
      entities:
        - sensor.example
default_expanded: false
hold_action:
  action: more-info
  entity: sensor.example
header_style: |
  --ha-card-background: var(--primary-background-color);
  --ha-card-border-radius: 0;
card_style: |
  --ha-card-border-radius: 0;
drawer_style:
  gap: 12px
```

- `header` is a normal Lovelace card configuration.
- `drawer.cards` accepts any number of normal Lovelace card configurations.
- `drawer.columns` is a positive integer; it defaults to `2`.
- `default_expanded` controls the initial state: `true` starts with the drawer
  expanded, while `false` (the default) starts it collapsed.
- `expanded` remains supported as a legacy alias for `default_expanded`;
  `default_expanded` takes precedence when both are set.
- `hold_action` uses Home Assistant's standard card action configuration. A
  normal header click toggles the drawer.
- `header_style` applies CSS declarations to the header card element.
- `card_style` applies CSS declarations to each drawer card element.
- `drawer_style` applies CSS declarations to the drawer content container.

Style values may be a CSS declaration string or a YAML map. CSS custom
properties such as `--ha-card-background` are inherited by the embedded card,
and are the most reliable way to theme its internals. For selector-based
styling inside third-party cards, use the styling mechanism provided by that
card (for example, card-mod if installed).

The component does not depend on ha-lcars or LARdS; their cards can be used in
either area like any other Lovelace card.
