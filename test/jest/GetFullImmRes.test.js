import "../../node/locale/i18n.js";
import "../../js/parser.js";
import "../../js/utils.js";
import "../../js/render.js";
import "../../js/utils-config.js";

/**
 * Examples, in order of printing (newest to oldest):
 *
 *  - Aurnozci (BMT) -- acid, fire, poison; bludgeoning, piercing, and slashing from nonmagical attacks
 *  - Deathlock (MPMM) -- necrotic; bludgeoning, piercing, and slashing from nonmagical attacks that aren't silvered
 *  - Air Elemental (MM) -- lightning, thunder; bludgeoning, piercing, and slashing from nonmagical attacks
 */

describe("Basic rendering", () => {
	it("Should render flat resistances", () => {
		expect(Parser.getFullImmRes(["acid"])).toBe("强酸");
		expect(Parser.getFullImmRes(["acid", "bludgeoning"])).toBe("强酸, 钝击");
		expect(Parser.getFullImmRes(["强酸", "unknown"], {isPlainText: true})).toBe("强酸, unknown");
		expect(Parser.getFullCondImm(["blinded", "魅惑"], {isPlainText: true})).toBe("目盲, 魅惑");
		expect(Parser.getFullCondImm(["blinded"], {isEntry: true})).toBe("{@condition blinded||目盲}");
		expect(Parser.getFullCondImm(["disease"], {isPlainText: true})).toBe("疾病");
		expect(Parser.getFullCondImm(["disease"], {isEntry: true})).toBe("疾病");
	});
});

describe("Complex rendering", () => {
	it("Should render complex resistances", () => {
		expect(
			Parser.getFullImmRes(
				[
					"acid",
					"bludgeoning",
					{
						resist: [
							"cold",
						],
					},
				],
			),
		).toBe("强酸, 钝击; 寒冷");

		expect(
			Parser.getFullImmRes(
				[
					"acid",
					"bludgeoning",
					{
						resist: [
							"cold",
							"fire",
						],
					},
				],
			),
		).toBe("强酸, 钝击; 寒冷 和 火焰");

		expect(
			Parser.getFullImmRes(
				[
					"acid",
					"bludgeoning",
					{
						resist: [
							"cold",
							"fire",
							"force",
						],
					},
				],
			),
		).toBe("强酸, 钝击; 寒冷, 火焰, 和 力场");

		expect(
			Parser.getFullImmRes(
				[
					"acid",
					"bludgeoning",
					{
						resist: [
							"cold",
							"fire",
						],
						note: "from nonmagical attacks",
					},
				],
			),
		).toBe("强酸, 钝击; 寒冷 和 火焰 from nonmagical attacks");
	});
});

describe("Nested rendering", () => {
	it("Should render nested resistances", () => {
		expect(
			Parser.getFullImmRes(
				[
					{
						resist: [
							"acid",
							"bludgeoning",
							{
								resist: [
									"cold",
								],
								note: "from nonmagical attacks",
							},
						],
						preNote: "While bloodied:",
					},
				],
			),
		).toBe("While bloodied: 强酸, 钝击; 寒冷 from nonmagical attacks");
	});
});

describe(`"special" rendering`, () => {
	it("Should render special resistances", () => {
		expect(
			Parser.getFullImmRes(
				[
					{
						"special": "damage of the type matching the animated breath's form (acid, cold, fire, lightning, or poison)",
					},
				],
			),
		).toBe("damage of the type matching the animated breath's form (acid, cold, fire, lightning, or poison)");

		expect(
			Parser.getFullImmRes(
				[
					{
						"special": "damage of the type matching the animated breath's form (acid, cold, fire, lightning, or poison)",
					},
				],
				{
					isTitleCase: true,
				},
			),
		).toBe("damage of the type matching the animated breath's form (acid, cold, fire, lightning, or poison)");

		expect(
			Parser.getFullImmRes(
				[
					{
						"special": "Damage of the type matching the animated breath's form (Acid, Cold, Fire, Lightning, or Poison)",
					},
				],
				{
					isTitleCase: true,
				},
			),
		).toBe("Damage of the type matching the animated breath's form (Acid, Cold, Fire, Lightning, or Poison)");

		expect(
			Parser.getFullImmRes(
				[
					{
						resist: [
							"acid",
						],
					},
					{
						"special": "damage of the type matching the animated breath's form (cold, fire, lightning, or poison)",
					},
				],
			),
		).toBe("强酸; damage of the type matching the animated breath's form (cold, fire, lightning, or poison)");
	});
});
