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
if (game.modules.get("pf2e-brewrata")?.active) {
  const registry = game.brewrata.register("module-id")
  registry.errata("item-uuid-or-slug", "errata-uuid")
  // or
  registry.errata("item-uuid-or-slug", { uuid: "errata-uuid", description: "Description of the changes done" })
}
```


