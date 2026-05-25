# pf2e-brewrata
A library module for creating homebrew erratas to existing content

## Installation

```
cd pf2e-brewrata && bun install
```

## Resources

PF2e Wiki: https://github.com/foundryvtt/pf2e/wiki

### How to use this module

```js
Hooks.on("ready", () => {
  if (game.modules.get("pf2e-brewrata")?.active) {
    const registry = game.brewrata.register("module-id");
    registry.errata("item-uuid-or-slug", "errata-uuid");
    // or the following, for adding descriptions of what the errata does
    registry.errata("item-uuid-or-slug", { uuid: "errata-uuid", description: "Description of the changes done" });
  }
});
```

<img width="1741" height="1352" alt="image" src="https://github.com/user-attachments/assets/30bd0414-2e4c-4699-93c6-ef50d75a797d" />


