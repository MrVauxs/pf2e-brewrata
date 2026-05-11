import { packages } from "@7h3laughingman/foundry-types/client/_module.mjs";
import { ActorPF2e, ItemPF2e, ItemSheetPF2e } from "@7h3laughingman/pf2e-types";
import { dev } from "./utils";
import { ApplicationV1HeaderButton } from "@7h3laughingman/foundry-types/client/appv1/api/_module.mjs";

declare module "@7h3laughingman/pf2e-types" {
	interface GamePF2e {
		brewrata: Brewrata;
		modules: Collection<string, packages.Module> & {
			get(key: "pf2e-brewrata"): packages.Module;
		}
	}
}

class Brewrata {
	constructor() {
		console.log("Brewrata initialized");
		this.#hookId = Hooks.on("getItemSheetHeaderButtons", (a: any, b: any) => this.#hook(a, b));

		if (dev) {
			const brewrataModule = this.register("pf2e-brewrata");

			// Testing kit. Uses Spell Effect: Shield
			brewrataModule.errata("Compendium.pf2e.spell-effects.Item.Jemq5UknGdMO7b73", { uuid: "Item.PcNy48HbesPnTLr2", description: "A short description." });
			brewrataModule.errata("Compendium.pf2e.spell-effects.Item.Jemq5UknGdMO7b73", "non-working-example");
			brewrataModule.errata("Compendium.pf2e.spell-effects.Item.Jemq5UknGdMO7b73", { uuid: "Item.PcNy48HbesPnTLr2", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent rutrum placerat tincidunt. Sed pellentesque lorem eu ornare efficitur. Fusce in augue ac nisi tempus sodales. Sed semper urna hendrerit justo venenatis feugiat ac vel arcu. Aenean ac nibh ex. Vestibulum ornare orci at magna posuere, sed pulvinar quam facilisis. Vestibulum placerat at neque nec laoreet. Aliquam nunc leo, convallis ut efficitur luctus, sodales eget orci. Sed a metus a ex consectetur scelerisque. Aliquam ac elit eget nisi porttitor semper vel quis felis. Donec in semper purus. Aliquam erat volutpat." });

			brewrataModule.errata("experimental-spellshaping", { uuid: "Item.OAcxS625AXSGrQIC", description: "A short description." });
		}
	}

	#hookId: number;
	#hook(sheet: ItemSheetPF2e<any>, buttons: ApplicationV1HeaderButton[]) {
		const item = sheet.item as ItemPF2e<any>;
		if (!item) return;


		const erratas = (item: ItemPF2e) => {
			const trueForms = item.flags['pf2e-brewrata']?.trueForm as string[] | undefined;
			const trueUuid = item.flags['pf2e-brewrata']?.trueUuid as string;

			return trueForms && trueForms.length > 0 ? [
				{
					uuid: trueUuid,
					description: "This item has already been errata'd. This is the original item.",
					module: trueUuid.split(".")[1]!
				},
				...(trueForms.flatMap(trueForm => this.getErratasForItem(trueForm) ?? [])),
			] : [
				...(item.sourceId ? this.getErratasForItem(item.sourceId) : []),
				...(item.slug ? this.getErratasForItem(item.slug) : [])
			];
		}

		if (!erratas(item).length) return;

		buttons.unshift({
			label: "Brewrata",
			class: "brewrata-button",
			icon: "fas fa-flask",
			onclick: () => this.#onclick(item, () => erratas(item)),
		});
	}

	async #onclick(item: ItemPF2e<ActorPF2e | null>, errataFn: (item: ItemPF2e<any>) => ErrataDataWithModule[]) {
		const erratas = errataFn(item);
		if (!erratas.length) return console.warn(`No errata for ${item.uuid}.`);

		const errataItemsPromise = (await Promise.allSettled(erratas.map(x => fromUuid(x.uuid).then(i => ({ item: i as ItemPF2e, description: x.description, module: x.module })))));
		if (errataItemsPromise.some(x => x.status === "rejected" || !x.value.item)) {
			console.warn(`Some errata items were not found.`, errataItemsPromise.filter(x => x.status === "rejected" || !x.value.item));
		}

		const errataItems = errataItemsPromise.filter(x => x.status === "fulfilled").map(x => x.value).filter(x => x.item);
		if (!errataItems.length) return console.error(`Errata items were not found??`, errataItems);

		if (dev) console.log(`Showing errata for ${item.name}`, errataItems);

		new foundry.applications.api.DialogV2({
			window: {
				title: "Choose an Errata"
			},
			position: {
				width: 600
			},
			content: `
				<main class="brewrata-errata-summary">
					<p>Select an errata to apply to <strong>${item.name}</strong>:</p>
					<div class="brewrata-errata-list">
						${errataItems.map((errata, i) => `
							<label class="brewrata-errata-option">
								<input type="radio" name="errata-select" value="${i}" />
								<div class="brewrata-errata-card">
									${errata.item?.img ? `<img class="brewrata-errata-icon" src="${errata.item.img}" alt="${errata.item.name}" />` : ""}
									<div class="brewrata-errata-info">
										<span class="brewrata-errata-name">${errata.item?.name ?? "Unknown"}</span>
										<span class="brewrata-errata-module">${errata.module}</span>
										${errata.description ? `<p class="brewrata-errata-desc">${errata.description}</p>` : ""}
									</div>
								</div>
							</label>
						`).join("")}
					</div>
					<footer class="brewrata-errata-addendum">
						Please note that both <b>Update</b> and <b>Replace</b> may break existing effects or relations. Use Replace for full-item replacement including making new Rule Element choices. You can revert after applying an errata.
						<b>Ignore</b> will remove Brewrata from appearing on this item.
					</footer>
				</main>
			`,
			classes: ["brewrata-dialog"],
			buttons: [
				{
					label: "Replace",
					action: "replace",
					icon: "fa-solid fa-arrows-rotate",
					disabled: !item.parent,
					// @ts-expect-error Ugh
					callback: (event, button, dialog) => ({ type: "replace", value: button.form?.elements['errata-select'].value })
				},
				{
					label: "Update",
					action: "update",
					icon: "fa-solid fa-check",
					// @ts-expect-error Ugh
					callback: (event, button, dialog) => ({ type: "update", value: button.form?.elements['errata-select'].value })
				},
				{
					label: "Cancel",
					action: "cancel",
					icon: "fa-solid fa-xmark",
					callback: (event, button, dialog) => ({ type: "cancel" })
				},
				/* {
					label: "Ignore",
					action: "ignore",
					icon: "fa-solid fa-minus",
					callback: (event, button, dialog) => ({ type: "ignore" })
				}, */
			],
			// Grab the selected radio value before confirm resolves
			submit: async (r) => {
				const result = r as { type: "update" | "replace" | "cancel" | "ignore"; value: number };
				if (result.type === "cancel") return;
				if (result.type === "ignore") {
					// TODO: Add to a user-defined ignore list. User settings much? :weary:
					return;
				}
				const errata = errataItems[result.value];
				if (!errata) {
					console.warn(`No errata selected, doing nothing.`);
					return;
				}

				if (result.type === "replace") {
					const flags = item.flags as Record<string, unknown>;
					if (!flags["pf2e-brewrata"]) {
						flags["pf2e-brewrata"] = { trueUuid: item.sourceId, trueForm: [item.sourceId, item.slug], appliedFrom: errata.module };
					}
					const newItem = errata.item.clone({ flags, _id: item._id, folder: item.folder }, { keepId: true });
					await item.delete();
					await item.parent!.createEmbeddedDocuments("Item", [newItem.toObject()], { keepId: true, keepEmbeddedIds: true });
				} else if (result.type === "update") {
					const flags = item.flags as Record<string, unknown>;
					if (!flags["pf2e-brewrata"]) {
						flags["pf2e-brewrata"] = { trueUuid: item.sourceId, trueForm: [item.sourceId, item.slug], appliedFrom: errata.module };
					}
					const newItem = errata.item.clone({ flags }, { keepId: true });
					const updates = newItem.toObject();
					item.update(updates);
				}
			},
		}).render(true);
	}

	destroy() {
		Hooks.off("getItemSheetHeaderButtons", this.#hookId);
	}

	get version() {
		return game.modules.get("pf2e-brewrata").version;
	}

	#record: Record<string, ModuleBrewrata> = {};

	register(key: string) {
		const module = game.modules.get(key);
		if (!module) throw new Error(`Module ${key} not found, spelling mistake?`);
		if (!module.active) throw new Error(`Module ${key} is not active, what are you doing?`);
		if (this.#record[key]) throw new Error(`Module ${key} already registered.`);

		this.#record[key] = new ModuleBrewrata(key);

		return this.#record[key];
	}

	// Gathers all erratas into one index. May include multiple erratas for the same item.
	get allErratas(): [string, ErrataDataWithModule][] {
		const modules = Object.values(this.#record);
		const erratas = modules.flatMap((m) => m.erratas.map(([u, data]) => [u, { ...data, module: m.id }] as [string, ErrataDataWithModule]));
		return erratas;
	}

	getErratasForItem(uuidOrSlug: string | null): ErrataDataWithModule[] {
		if (!uuidOrSlug) return [];
		return this.allErratas.filter(([u]) => u === uuidOrSlug).map(x => x[1]);
	}
}

type ErrataDataWithModule = ErrataData & { module: string };

type ErrataData = {
	uuid: string;
	description?: string;
}

class ModuleBrewrata {
	id: string;
	constructor(key: string) {
		console.log(`Brewrata initialized for module ${key}`);
		this.id = key;
	}

	erratas: [string, ErrataData][] = [];

	/**
	 * Main errata function
	 * @param toBeErrata Slug or UUID of item that is being errata'd
	 * @param errata UUID of the item that is being errata'd or a more detailed data object
	 */
	async errata(toBeErrata: string, errata: string | ErrataData) {
		console.log(`Errata applied for ${toBeErrata} and ${errata}`);
		const data = typeof errata === "string" ? { uuid: errata } : errata;

		this.erratas.push([toBeErrata, data]);
		this._onErrata(toBeErrata);
	}

	unerrata(uuid: string) {
		console.log(`Errata removed for ${uuid}`);
		this.erratas = this.erratas.filter(([key]) => key !== uuid);
		this._unErrata(uuid);
	}

	_onErrata(uuid: string) {
	}

	_unErrata(uuid: string) {
	}
}

export { Brewrata };

if (import.meta.hot) {
	import.meta.hot.accept((newModule) => {
		if (newModule) {
			// Remove all old hooks
			game.brewrata.destroy();
			game.brewrata = new newModule.Brewrata();
			ui.notifications.info("Brewrata reloaded");
		}
	})
}