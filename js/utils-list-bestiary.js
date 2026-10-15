import {EncounterBuilderCreatureGroupEntityCreature} from "./encounterbuilder/encounterbuilder-models-creaturegroup.js";
import {EncounterBuilderComponentBestiary} from "./bestiary/bestiary-encounterbuilder-component.js";

export class ListUtilBestiary extends ListUtilEntity {
	static _getString_action_currentPinned_name ({page}) { return "从当前怪物遭遇"; }
	static _getString_action_savedPinned_name ({page}) { return "从已保存的怪物遭遇"; }
	static _getString_action_file_name ({page}) { return "从怪物遭遇文件"; }

	static _getString_action_currentPinned_msg_noSaved ({page}) { return "没有保存的怪物遭遇！请先前往怪物遭遇表并创建一个。"; }
	static _getString_action_savedPinned_msg_noSaved ({page}) { return "没有找到已保存的怪物遭遇！请前往怪物遭遇表并创建一些。"; }

	static async _pGetLoadableSublist_getAdditionalState ({exportedSublist}) {
		const encounterInfo = EncounterBuilderComponentBestiary.getStateFromExportedSublist({exportedSublist});
		return {encounterInfo};
	}

	static async pGetLoadableSublist (opts) {
		return super.pGetLoadableSublist({...opts, page: UrlUtil.PG_BESTIARY});
	}

	static _getFileTypes ({page}) {
		return [
			...super._getFileTypes({page}),
			"encounter",
		];
	}

	static getContextOptionsLoadSublist (opts) {
		return super.getContextOptionsLoadSublist({...opts, page: UrlUtil.PG_BESTIARY});
	}
}

export class EncounterBuilderHelpers {
	static getSublistedCreatureGroup ({sublistItem}) {
		const mon = sublistItem.data.entityBase;

		return new EncounterBuilderCreatureGroupEntityCreature({
			id: sublistItem.data.collectionId,

			creature: sublistItem.data.entity,
			count: Number(sublistItem.data.count),

			isLocked: sublistItem.data.isLocked,

			customHashId: sublistItem.data.customHashId,
			baseCreature: mon,
		});
	}

	static async pGetEncounterName (exportedSublist) {
		if (exportedSublist.name) return exportedSublist.name;

		const expandedList = await ListUtil.pGetSublistEntities_fromHover({
			exportedSublist,
			page: UrlUtil.PG_BESTIARY,
		});

		if (!expandedList?.length) return "（未命名遭遇）";

		const {count, entity: {name}} = expandedList
			.sort((a, b) => SortUtil.ascSort(b.count, a.count) || SortUtil.ascSort(b.entity.name, a.entity.name))[0];

		return `与${name}的遭遇${count > 1 ? ` ×${count}` : ""}`;
	}
}
