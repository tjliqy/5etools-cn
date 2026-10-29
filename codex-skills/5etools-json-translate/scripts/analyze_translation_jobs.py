#!/usr/bin/env python3
"""Report translator analyser jobs and likely untranslated target occurrences."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

TRANSLATOR_ROOT = Path("/data/5e-translator")
sys.path.insert(0, str(TRANSLATOR_ROOT))

from app.core.translator.analyser.json_analyser import JsonAnalyser  # noqa: E402
from app.core.translator.job_need_translate_setter import JobNeedTranslateSetter  # noqa: E402


SEGMENT = re.compile(r"^(?P<key>[^[]+)(?:\[(?P<selector>.*)\])?$")
EMBEDDED_TAG_SUFFIX = re.compile(r"/(?P<tag>[A-Za-z0-9][A-Za-z0-9_-]*)\[\d+\]$")


def stable_token(value) -> str:
    text = re.sub(r"\s+", "-", str(value or "").strip())
    text = re.sub(r"[^0-9A-Za-z_.@|:-]+", "-", text).strip("-")
    if len(text) > 80:
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
        text = f"{text[:70]}-{digest}"
    return text


# optionalfeature featureType values are routing keys into _meta.optionalFeatureTypes
# ("name" or cross-source "name:SOURCE") and stay byte-identical in translated files.
# Foundry VTT config subtrees are machine values substituted verbatim by Foundry/
# (also foundryClassFeature activities roll.formula dice strings like "d@flags.ll.exploit.faces")
# plutonium import: midiProperties enums ("default", "never"), midi-qol/dae/
# ActiveAuras/plutonium/dnd5e/core flags ("multi", "system", "turnStartSource",
# "1Attack", dedupeId, hash, sourceId, advancementOrigin) and heal-activity
# formulas ("@scale.dancer.special-dance-roll"). Translating any of them would
# break Foundry import semantics. foundryEffects change leaves (key/value like
# "system.attributes.senses.truesight"/"@attributes.senses.blindsight") are
# Foundry data-path/formula tokens with the same verbatim-substitution semantics.
# Feat-level foundryActivities carry the same semantics: save DC formulas
# ("8 + @prof + max(...)"), target.affects count formulas
# ("1 + @flags.ll.leadership.mod"), check.associated skill enums ("itm"), and
# consumption target data-paths ("currency.gp"). additionalSpells choose
# strings ("level=0|class=alternate sorcerer (llasorc)") are filter syntax.
# LLAW-style foundry feature sections nest the same activity data directly
# under "activities" (no foundryActivities wrapper): range value formulas
# ("30 * @scale.warlord.tactical-superiority"), save/dc.formula
# ("@flags.ll.exploit.dc"), target.affects count ("@flags.ll.leadership.mod"),
# intra-feature activity.id cross-references ("LLAWActivityZeAD"), and
# summon profiles cr ("floor(@classes.warlord.levels / 3)") are all
# Foundry-evaluated machine values.
# LLExploits-style feat-level foundryActivities add five more of the same
# semantics: roll.formula exploit-dice strings ("d@flags.ll.exploit.faces",
# "(3 * @scaling)d@flags.ll.exploit.faces + @abilities.wis.mod"), check
# DC formulas ("@flags.ll.exploit.dc"), duration unit enums ("miunte" —
# upstream typo for minute), summon profile creature uuids
# ("@creature[Mercenary (Brute)"), and target affects type enums
# ("creatureOrObject").
# FoxfireVamp-style spells carry custom three-letter school codes ("BLO",
# "ANI", "OBL", "PRE", "CEL", "AUS", "OBF", "DOM", "PRO") beyond the official
# one/two-letter set; school is always a routing enum and stays byte-identical
# (official short codes already pass the ≤2-char analyser length rule).
# foundryClassFeature entryData resources faces leaves are Foundry scale
# formulas ("(@scale.demi-dragon.fabled-resistance-dice)") with the same
# verbatim-substitution semantics as activities roll.formula.
# Book-level author metadata ("book.author": "grzart"), entries by-credits
# ("by": "Arcee"), and monster fluff font arrays (Jin-Gitaxias phonetic
# speech "či'n-gütx" rendered in a fantasy font) are identity/decoration
# content that stays verbatim.
# LLAF-style Foundry activity data adds five more verbatim machine shapes:
# foundryActivities activity.id instance identifiers ("LLAFActivitySUM7"),
# effect riders.activity/riders.effect cross-references to those IDs
# ("LLAFActivitySRBA"/"LLAFEffectSRSNR0"), activities check.associated
# ability codes ("prc"), activities consumption.targets value formulas
# ("-@flags.ll.exploit.number"), and dot-form save.dc.formula
# ("8 + @prof + @flags.ll.leadership.mod").
# item dmg1/dmg2 are damage-formula fields the renderer feeds verbatim into
# one {@damage ...} tag and Foundry import parses as a formula; authors
# sometimes embed a damage-type word in the math ("1d4 + 1 necrotic + 1d4 + 1",
# BA Duality Blade) and every zh repository keeps dmg1/dmg2 byte-identical
# Latin dice math, so the whole leaf stays machine.
# itemTypeAdditionalEntries appliesTo ("EXPMH" = itemType abbreviation EXP +
# source MH), vehicleUpgrade upgradeType ({"MH:VU"} keys of _meta
# .vehicleUpgradeTypes; zh main repo keeps "IWM:W" Latin), and magicvariant
# inherits weight/valueExpression ("[[baseItem.value]]*10" interpolation
# templates; zh main repo 具装 keeps them byte-identical) are entity-routing
# codes / renderer math, all kept Latin in every zh repository.
MACHINE_LEAF = re.compile(r"/(alId|colStyles(?:\[\d+\])?|summonedByClass|style|type/tags(?:\[\d+\])?|spellcasting(?:\[\d+\])?/ability|featureType(?:\[\d+\])?|page|dmg[12]|(?:skill|save)/[a-z]+|midiProperties/[A-Za-z0-9_]+|healing/bonus|flags(?:/[A-Za-z0-9_.%-]+|\[\d+\])+|foundryEffects(?:\[[^\]]*\])?/changes(?:\[\d+\])?/(?:key|mode|value|priority)|activities(?:\[[^\]]*\])?/roll\.formula|foundryActivities(?:\[[^\]]*\])?/save/dc\.formula|foundryActivities(?:\[[^\]]*\])?/target\.affects/count|foundryActivities(?:\[[^\]]*\])?/check\.associated(?:\[\d+\])?|foundryActivities(?:\[[^\]]*\])?/consumption/targets(?:\[\d+\])?/target|additionalSpells(?:\[[^\]]*\])?/(?:known|innate|prepared)/_(?:\[\d+\])?(?:/(?:atwill|daily|weekly)\/[a-z0-9]+\[\d+\])?/choose|resources(?:\[[^\]]*\])?/count|activities(?:\[[^\]]*\])?/settings/(?:minimumAC|tempFormula)|activities(?:\[[^\]]*\])?/(?:range/value|save/dc\.formula|target\.affects/count|activity\.id)|foundryActivities(?:\[[^\]]*\])?/activity\.id|(?:foundryActivities|activities)(?:\[[^\]]*\])?/effects(?:\[\d+\])?/riders\.(?:activity|effect)(?:\[\d+\])?|activities(?:\[[^\]]*\])?/check\.associated(?:\[\d+\])?|activities(?:\[[^\]]*\])?/consumption\.targets(?:\[\d+\])?/value|activities(?:\[[^\]]*\])?/save\.dc\.formula|activities(?:\[[^\]]*\])?/(?:summon/)?profiles(?:\[\d+\])?/cr|foundryActivities(?:\[[^\]]*\])?/roll\.formula|foundryActivities(?:\[[^\]]*\])?/check/dc\.formula|foundryActivities(?:\[[^\]]*\])?/duration/units|foundryActivities(?:\[[^\]]*\])?/(?:summon/)?profiles(?:\[\d+\])?/uuid|foundryActivities(?:\[[^\]]*\])?/target/affects\.type|spell(?:\[[^\]]*\])?/school|spell(?:\[[^\]]*\])?/subschools(?:\[\d+\])?|foundryClassFeature(?:\[[^\]]*\])?/entryData/resources(?:\[[^\]]*\])?/faces|book(?:\[[^\]]*\])?/author|adventure(?:\[[^\]]*\])?/author|by|fluff(?:\[[^\]]*\])?/entries(?:\[[^\]]*\])?/font(?:\[\d+\])?|foundryImg(?:\[[^\]]*\])?|_copy(?:\[[^\]]*\])?/_mod/inherits\.valueExpression/value|_copy(?:\[[^\]]*\])?/_mod/items(?:\[\d+\])?/replace|items\[name=Example-[^\]]*\]/entr(?:y|ies)(?:\[\d+\])?|items\[name=[^\]]*(?:Playtesters?|Credits?|Artists?|Illustrators?|Authors?|Editors?|Cartographers?|Designers?|Developers?|Proofreaders?|Typesetters?|Consultants?|Playtest)[^\]]*\]/entries(?:\[\d+\])?|fontFamily|itemProperty(?:\[[^\]]*\])?/template|citation(?:\[[^\]]*\])?/name|appliesTo|upgradeType(?:\[\d+\])?|inherits/(?:weight|value)Expression)$")

# Renderer variable placeholders like "<$cha_mod$>" (item charge counts) are
# substituted verbatim by the site and must stay byte-identical.
VARIABLE_TOKEN = re.compile(r"^<\$[^<$]+\$>$")

# Renderer formulas mixing several variable placeholders with arithmetic, e.g.
# class.preparedSpells "<$level$> + <$cha_mod$>", are evaluated verbatim by the
# site and must stay byte-identical; single tokens are covered by VARIABLE_TOKEN.
VARIABLE_FORMULA = re.compile(
    r"^<\$[^<$]+\$>(?:\s*[+\-*/×÷]\s*(?:<\$[^<$]+\$>|\d+))*$"
)

# Renderer formulas additionally wrapped in an evaluated math function, e.g.
# classFeature resources count "ceil(<$level$> / 2)" or main-repo
# "floor((<$level$> + 1) / 8) + 4", are evaluated verbatim by the site and must
# stay byte-identical; the zh data keeps such function formulas untranslated.
VARIABLE_FORMULA_FUNCTION = re.compile(
    r"^(?:ceil|floor|max|min)\(\s*<\$[^<$]+\$>\s*(?:[+\-*/×÷]\s*(?:<\$[^<$]+\$>|\d+)\s*)+\)"
    r"(?:\s*[+\-*/×÷]\s*(?:<\$[^<$]+\$>|\d+))*$"
)

# Foundry scene/map config values like "#ffffff" (foundrySceneRoot lights color) are
# machine color codes substituted verbatim by the renderer; they must stay byte-identical
# and are never translatable text.
HEX_COLOR_TOKEN = re.compile(r"^#[0-9A-Fa-f]{3,8}$")

# {@link display|url} field 0 is normally translatable display text, but a single-field
# bare URL ({@link incompetech.com}) is machine content rendered verbatim.
URL_TOKEN = re.compile(r"^(?:https?://|www\.)?[A-Za-z0-9][A-Za-z0-9_%#,&=./?+-]*\.[A-Za-z]{2,}(?:[/?#][^\s]*)?$")

# Tag-segment sub-jobs address individual pipe fields inside a containing string, e.g.
# uid "...entries[0].condition[0].1" is pipe field 1 of the second {@condition ...} tag.
# Tag names may start with a digit ({@5etools ...}).
TAG_FIELD_UID = re.compile(r"\.(?P<tag>[A-Za-z0-9][A-Za-z0-9_-]*)\[\d+\]\.(?P<field>\d+)$")
# Malformed tags missing their type ("{@ baby mimics|src}" -> uid "...entries[2].[1].0")
# are source defects kept byte-identical; their key paths carry an unresolvable bare
# "/[N]" tag segment and the swallowed first word is not an entity reference.
MALFORMED_TAG_UID = re.compile(r"\.\[\d+\]\.\d+$")
# Variable-style tags whose pipe field 0 is a machine variable name (VDC/Vdist/Vdam) or number.
# Their field 0 is always a formula/variable ("10 + PB", "1d6 − 1", "int 20"), never display
# prose, so whitespace/operators do not make it translatable.
VARIABLE_TAGS = {"footnote", "damage", "dice", "scaledice", "scaledamage", "hit", "dc", "ability", "skillCheck"}
# Tags whose pipe fields >=1 are routing anchors that must stay byte-identical to the
# untranslated section ids even though they contain spaces, e.g.
# {@area 压力板陷阱|3. Pressure Plate Trap|x} routes to id "3. Pressure Plate Trap".
ROUTE_TAG_FIELDS = {"area"}
# Machine tokens carry no whitespace: source codes (HFN2025, MD-BNR), URLs
# (quickreference.html#bookref-quick,3,surprise,0), variable scale labels (Vdam x 2),
# numeric ranges (12/14/15), style parameters (dnd-font;large). Prose always contains spaces.
# Source codes may carry a colon: declared abbreviations (KT:SB) and pipe-suffix
# routing forms ("kibblestasty:cc"/"kibblestasty:bms" in classSpells) stay
# byte-identical machine anchors even when the dependency is undeclared in _meta.
MACHINE_TOKEN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_./#,%?=&;:-]*(?: x \d+)?$")
# Dice-math expressions whose only word token is the proficiency bonus alias,
# e.g. "+ PB" or "30 + 10 × PB". Pure machine math, never translatable prose.
PB_FORMULA = re.compile(r"[+\-−\d\s,dD×xX*/().]*PB[+\-−\d\s,dD×xX*/().]*")
# Foundry/plutonium @-variable formulas surfaced in item display fields, e.g.
# dmg1 "1d10 + @srd5e.userchar.pb" or bonusWeaponAttack "3 + @srd5e.userchar.pb",
# are substituted verbatim by the renderer/Foundry and stay byte-identical.
AT_VARIABLE_FORMULA = re.compile(
    r"^(?:[0-9]+|d[0-9]+)[0-9a-zA-Z_+\-*/().\s]*@[a-zA-Z_][a-zA-Z0-9_.]*[0-9a-zA-Z_+\-*/().\s]*$"
)
# Foundry active-effect/versions handlebar templates ("{{damageType}}" in
# monster _versions._abstract._mod damage defenses) are substituted by Foundry
# at import time and stay byte-identical.
FOUNDRY_TEMPLATE = re.compile(r"^\{\{[A-Za-z0-9_.-]+\}\}$")
# Pure-Latin author bylines ("by Justice Arman") in bookData/adventureData
# front matter are credit identity strings kept verbatim.
BYLINE_TOKEN = re.compile(r"^by [A-Z][A-Za-z .''-]+$")
# All-ASCII artwork credit lines "<Artwork title> by <Artist>" (bookData
# interior-art lists, "The Dresden Files - Your Story by Javier Charro") are
# external real-world artwork and artist identity strings kept verbatim, the
# "<Title> by <Name>" companion of BYLINE_TOKEN above; artists are often
# lowercase handles ("lhs", "JakeMurray"), so no case constraint is possible.
CREDIT_ARTWORK = re.compile(
    r"^[A-Za-z0-9][A-Za-z0-9 '\()!,;&+\-]* by [A-Za-z0-9][A-Za-z0-9 '\()\-]*$"
)
# Credit identity lines pairing a real-world artist name with a social-media
# handle ("Alexander Cloos {@b @varguyart}", bookData credits lists) and the
# bare handle tokens the tag tokenizer emits from them ("@varguyart") are
# identity strings kept verbatim — the handle-bearing companion of
# CREDIT_ARTWORK above; names may carry non-ASCII letters ("Almir Gusić").
CREDIT_HANDLE_LINE = re.compile(r"^[^\W\d_][\w .'&()!\-,]* \{@b @\w+\}$")
HANDLE_TOKEN = re.compile(r"^@\w+$")
# Bare real-world person-name credit lines ("Martin Grip", "Martin Grip,
# Mattias Johnsson Haake", "Brandon Bowling, John Marron, John-Michael
# Warkentin" — bookData credits item entries) are identity strings kept
# verbatim, the bare-name companion of CREDIT_HANDLE_LINE above; every
# comma-separated item is all-capitalized tokens (hyphenated compounds
# allowed), and the "/items[" key-path gate keeps ordinary Titlecase prose
# outside credits lists in scope for translation.
CREDIT_NAME_LINE = re.compile(
    r"^[A-Z][\w'.-]*(?:[ -][A-Z][\w'.-]*)*"
    r"(?:, ?[A-Z][\w'.-]*(?:[ -][A-Z][\w'.-]*)*)*$"
)
# Constructed-language puzzle/vocabulary tokens ("thrimsan", "kauravi") are
# all-lowercase invented words; translating them would break letter/order
# based puzzles, and real English terms in lists are capitalized.
CONLANG_TOKEN = re.compile(r"^[a-z][a-z'-]{4,}$")
# Pure currency amounts ("25 sp", "1,200 gp", "3000 GF"). The upstream
# need_translate_str fullmatch exemption only covers "N gp"; sp/cp/ep/pp
# price cells are the same machine-literal class and the zh repositories
# keep every currency code Latin. Homebrew custom coin codes declared in
# _meta.currencyConversions ("7 GF", "3 CB" ObojimaCurrency gf/cb) belong to
# the same class and stay Latin in either case.
CURRENCY_FULL = re.compile(r"^\d{1,4}(?:,\d{3})*\s+(?i:gp|sp|cp|ep|pp|gf|cb)$")
# Invented measure codes a book defines verbatim in its own table footnotes
# ("8 oph" travel speed = mph, "1 obe" = mile, Obojima) are definition-bearing
# unit codes the zh target keeps Latin next to the translated footnote
# ("1 oph 等于 1 英里/小时"); translating them would orphan the footnote
# definition.
UNIT_CODE = re.compile(r"^\d+(?:\.\d+)?\s+(?:oph|obe)$")
# Bare dice-progression ladders ("d6 → d8 → d10 → d12" Song of Rest healing
# dice, "d4 ~ d6 ~ d8 ~ d10 ~ d12" damage growth) are pure dice notation the
# renderer shows verbatim; they carry no translatable prose (only dN tokens
# joined by →/~ separators) and the zh repositories keep them byte-identical.
DICE_LADDER = re.compile(r"^d\d+(?:\s*[→~]\s*d\d+)+$")
# Entity-lookup tags whose pipe field 1 routes to another file's source code;
# display field 0 is then the entity's name *in that external file*, not free
# prose. Whitelisted to entity tags so style/link/variable tags never match.
# ({@subclass Name|Class|Source} carries the class in pipe field 1, so
# subclass stays off the whitelist; its route is not a plain source code.)
EXTERNAL_ENTITY_TAG = re.compile(
    r"\{@(?P<tag>creature|spell|item|baseitem|background|race|class|"
    r"feat|optfeature|book|adventure|deity|vehicle|object|trap|hazard|disease|"
    r"condition|status|sense|action|cult|reward|variantrule|charoption|psionic|"
    r"table|skill) (?P<display>[^{}|]+)\|(?P<route>[^{}|]+)"
)
# Short alphabetic source codes ("SaF", "WDH", "XGE") used as entity-tag pipe
# field 1; excludes URLs, paths, and free-text routing fields.
SOURCE_CODE_ROUTE = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,15}")
# Matches a 5etools tag and captures its display text (pipe field 0). Used to
# project a target string down to prose + localized display text before the
# residual substring check, so English inside routing fields (pipe fields >= 1,
# e.g. {@loader 战斗轮椅|collection/Sara Thompson; The Combat Wheelchair.json})
# cannot be mistaken for untranslated prose.
TAG_DISPLAY_ONLY = re.compile(r"\{@[^{}|]+\s([^|{}]*)(?:\|[^{}]*)*\}")

# Bare spell-array routing keys: classSpells/subclassSpells string entries and
# additionalSpells known/innate/prepared list leaves carry pipe-free spell names
# that the renderer resolves against the complete spell corpus by exact name.
# When the author referenced a spell that no repository defines (RCG
# "mantle of heroism"/"anti-life aura" — absent from data-bak, the English
# homebrew root, and every localized file), the key is a dead link mirroring a
# source defect: translating it would point the renderer at a Chinese-named
# spell that does not exist, so the zh target keeps it byte-identical to the
# source, the same deliberate-retention rule as external_entity_displays below.
SPELL_ARRAY_TAIL = re.compile(r"/(?:sub)?classSpells(?:\[\d+\])?(?:/\d+(?:\[\d+\])?)*$")
ADDITIONAL_SPELLS_HEAD = re.compile(
    r"/additionalSpells\[\d+\]/(?:known|innate|prepared)(?P<rest>(?:/[\d\[\]]+)+)?$"
)

_spell_absence_cache: dict[str, bool] = {}


def is_bare_spell_routing_key(key_path: str | None, en_str: str | None) -> bool:
    """True for pipe-free spell-name leaves of spell routing arrays."""
    if not key_path or not isinstance(en_str, str) or not en_str.strip():
        return False
    if "|" in en_str or "{" in en_str or "}" in en_str:
        return False
    if SPELL_ARRAY_TAIL.search(key_path):
        return True
    head = ADDITIONAL_SPELLS_HEAD.search(key_path)
    return bool(head and head.group("rest") is not None)


def spell_absent_from_all_corpora(key: str) -> bool:
    """True when no corpus defines a spell under this name.

    Probes quoted definition fields ("name" for English repositories,
    "ENG_name" for localized ones) so mere references ({@spell ...} tags,
    classSpells entries in other files) never count as definitions. A hit on
    any entity kind named identically keeps the answer conservative (the
    caller then does not exempt the job, and it stays visible as a residual).
    Scans lazily per distinct key and only over text directories (~0.5 GB
    total across both homebrew roots), skipping binary/asset directories.
    """
    if key in _spell_absence_cache:
        return _spell_absence_cache[key]
    definition = re.compile(
        r'"(?:name|ENG_name)"\s*:\s*"' + re.escape(key.strip()) + r'"',
        re.IGNORECASE,
    )
    roots: list[Path] = []
    for env_key, default in (
        ("HOMEBREW_EN_ROOT", "/data/homebrew-en"),
        ("HOMEBREW_ZH_SPELL_CORPUS_ROOT", "/data/homebrew"),
    ):
        base = Path(os.environ.get(env_key) or default)
        if base.is_dir():
            roots.extend(
                child
                for child in sorted(base.iterdir())
                if child.is_dir()
                and child.name
                not in {"_img", "node_modules", "_generated", "_doc", "_font", ".git"}
            )
    for extra in (
        Path("/data/5etools-mirror-2.github.io/data-bak/spells"),
        Path("/data/5etools-mirror-2.github.io/data/spells"),
    ):
        if extra.is_dir():
            roots.append(extra)
    absent = True
    for root in roots:
        for path in root.rglob("*.json"):
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if definition.search(text):
                absent = False
                break
        if not absent:
            break
    _spell_absence_cache[key] = absent
    return absent


def is_machine_tag_field(job) -> bool:
    """True for tag-segment sub-jobs addressing a routing/machine pipe field."""
    match = TAG_FIELD_UID.search(job.uid or "")
    if not match:
        return False
    field = int(match.group("field"))
    tag = match.group("tag")
    if field == 0 and tag == "link" and URL_TOKEN.fullmatch(job.en_str or ""):
        return True
    if field == 0 and tag == "link" and (job.en_str or "").strip() and not any(ch.isspace() for ch in job.en_str):
        # {@link display|url} field 0 without whitespace is a proper noun /
        # username / site anchor ("Wyldraven", "RanXi", "MobiusFlip",
        # "r/UnearthedArcana", "u/FragSauce's") in credits sections; artist and
        # author identity strings stay verbatim like multi-word credit names
        # that the prose heuristic already skips.
        return True
    if field == 0 and tag in VARIABLE_TAGS:
        # Variable formulas ("10 + PB", "1d6 − 1", "int 20") contain spaces/operators but
        # are never translatable display text.
        return True
    if field == 0 and tag == "itemProperty" and MACHINE_TOKEN.fullmatch(job.en_str or ""):
        # itemProperty tags address entities by abbreviation in pipe field 0
        # ({@itemProperty GC:VSS-Re|ValdaGunslinger|弹容}); the renderer resolves
        # them via DataUtil.itemProperty.unpackUid into an abbreviation index, so
        # field 0 is a machine routing key that stays byte-identical English across
        # the localized repo (200+ tags in data/ and homebrew keep Latin keys).
        return True
    if field == 0 and tag in ("atk", "atkr") and MACHINE_TOKEN.fullmatch(job.en_str or ""):
        # {@atk m,rw} pipe field 0 is a comma-separated attack-mode enum
        # (melee/ranged weapon codes) resolved by the renderer as machine keys;
        # the repo keeps these Latin codes verbatim in all attack entries.
        return True
    if field == 0 and tag == "code" and MACHINE_TOKEN.fullmatch(job.en_str or ""):
        # {@code Control-Alt-H}-style single Latin tokens in code tags are
        # literal machine content (keystrokes, commands, file names) the
        # renderer shows verbatim; code display text is never translated.
        return True
    if (
        field == 0
        and tag == "b"
        and (job.en_str or "").isupper()
        and MACHINE_TOKEN.fullmatch(job.en_str or "")
    ):
        # {@b UAMM}-style all-caps single tokens in bold are source-code /
        # rules abbreviations (UAMM, DC, AC) kept Latin in zh prose even when
        # the code is only referenced in text and absent from _meta sources.
        return True
    if field == 0 and tag == "i" and (job.en_str or "").strip() and not any(ch.isspace() for ch in job.en_str) and job.en_str.isascii():
        # {@i Bubblegumshoe}-style single Latin tokens in italics are product
        # names / foreign terms ({@i o-bakemono}) kept verbatim; translatable
        # italic prose always contains spaces or CJK.
        return True
    if field == 0 and tag not in VARIABLE_TAGS:
        return False
    if field >= 1 and tag in ROUTE_TAG_FIELDS:
        return True
    return bool(MACHINE_TOKEN.fullmatch(job.en_str or ""))


# Variable-substitution tokens injected by the site's dynamic-table rendering
# (Vmod/Vdam/VDC/VDist scale with hunt level), compact rarity/attunement codes
# defined by an in-file translated legend (U/V/L/R, Opt/Req+/Reqs/U-R*), and
# pure dice/currency composites ("{@dice 4d6} x 50 gp", "2 ({@b {@dice 1d4}})",
# "4,900 gp + 400 pp") — the surrounding tables are translated; these cells are
# machine-substituted or intentionally keep Latin units/codes.
_TABLE_VALUE_TOKEN = re.compile(
    r"^(?:V[A-Za-z]{1,6}(?:[+\-]\d+)?|V\dP\d|APL|Att|E\+V|U|V|L|R|C|Req|Reqs|Req\+|Req, C|Opt|Opt\+|U-R\*|—, C|XP\*|XP\{@sup \*\})$"
)
_RETAINED_SPECIES_NAMES = {
    # Pseudo-Latin binomials italicised in the source prose ({@i Veritae
    # mucoformus}); scientific-style species names stay verbatim.
    "Veritae mucoformus",
    "Amanita rotgut",
    "Noradreno mucorales",
    "Psilocybin kwikitrippiae",
}
# Personal/shop names deliberately kept in Latin in the book's own Chinese
# prose (L'Arsène appears verbatim inside translated sentences).
_RETAINED_LATIN_NAMES = {"L'Arsène"}


def is_retained_species_name(en_str) -> bool:
    s = (en_str or "").strip()
    return s in _RETAINED_SPECIES_NAMES or s in _RETAINED_LATIN_NAMES


def is_table_value_cell(en_str) -> bool:
    s = (en_str or "").strip()
    if not s:
        return False
    if _TABLE_VALUE_TOKEN.fullmatch(s):
        return True
    stripped = re.sub(r"\{@(?:dice|damage|b|hit)\s[^{}]*\}", " ", s)
    stripped = re.sub(r"\{[^{}]*\}", " ", stripped)
    units = r"(?:gp|sp|cp|ep|pp|lbs?\.?)"
    return bool(
        re.fullmatch(
            rf"[\d\s()+—–\-,./x%*×dDhXxPp]*(?:\d[\d,]*\s*{units}(?:\s*[+/,]\s*[\d\s,]+{units})*)?[\d\s()+—–\-,./x%*×dDhXxPp]*",
            stripped,
            re.IGNORECASE,
        )
        and re.search(r"\d", stripped)
    )


def is_brand_domain_link(job, target_value) -> bool:
    """True for a {@link Display|url} field-0 job whose display text repeats
    the link target's own domain brand ("Gaming Paper" ↔ gamingpaper.com).

    The display is then the site's proper name, which has no Chinese form;
    zh prose keeps such brand names verbatim ({@link Gaming Paper|
    https://gamingpaper.com/} in Arcadia Issue 8, whose surrounding sentence
    also keeps "Gaming Paper" untranslated).
    """
    match = TAG_FIELD_UID.search(job.uid or "")
    if not match or match.group("tag") != "link" or int(match.group("field")) != 0:
        return False
    display = (job.en_str or "").strip()
    if not display or not display.isascii():
        return False
    brand = re.sub(r"[^a-z0-9]", "", display.lower())
    if not brand:
        return False
    for tag_match in re.finditer(r"\{@link ([^{}|]+)\|([^{}|]+)", target_value or ""):
        if tag_match.group(1).strip() != display:
            continue
        raw_url = tag_match.group(2).strip()
        host = urlparse(raw_url if "://" in raw_url else "//" + raw_url).hostname or ""
        labels = [label for label in host.split(".") if label]
        # The brand may sit in the registrable label or a subdomain.
        if any(
            re.sub(r"[^a-z0-9]", "", label.lower()) == brand for label in labels[:-1]
        ):
            return True
    return False


def iter_json_strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, list):
        for value in node:
            yield from iter_json_strings(value)
    elif isinstance(node, dict):
        for value in node.values():
            yield from iter_json_strings(value)


def path_segments(key_path: str):
    if key_path.startswith("."):
        return key_path[1:].split(".")
    return [part for part in key_path.strip("/").split("/") if part]


def resolve_job_value(root, key_path: str):
    current = root
    resolved = ""
    for raw in path_segments(key_path):
        match = SEGMENT.match(raw)
        if not match or not isinstance(current, dict):
            return None, None
        key, selector = match.group("key"), match.group("selector")
        if key not in current:
            return None, None
        current = current[key]
        resolved += "/" + key
        if selector is None:
            continue
        if re.fullmatch(r"\d+\](?:\[\d+)*", selector):
            # analyser emits nested row-cell selectors as e.g. "rows[0][0]" -> selector "0][0]"
            for index in (int(part) for part in selector.replace("]", "").split("[")):
                if not isinstance(current, list) or index >= len(current):
                    return None, None
                current = current[index]
                resolved += f"/{index}"
            continue
        indexed_named = re.fullmatch(r"(\d+)\]\[(name=[^\]]+)$", selector)
        if indexed_named:
            # analyser emits index-anchored row-cell selectors as e.g. "rows[0][name=X]" ->
            # selector "0][name=X]": index the row, then select the named cell within it.
            # A trailing ";index=N" disambiguates duplicate row-cell names and is a
            # positional hint, not a field on the cell dict.
            index = int(indexed_named.group(1))
            if not isinstance(current, list) or index >= len(current):
                return None, None
            row = current[index]
            if not isinstance(row, list):
                return None, None
            name_parts = [p for p in indexed_named.group(2).split(";") if "=" in p and not p.startswith("index=")]
            explicit_cell_index = next((int(p.split("=", 1)[1]) for p in indexed_named.group(2).split(";") if p.startswith("index=")), None)
            expected = dict(part.split("=", 1) for part in name_parts)
            matches = []
            for cell_index, cell in enumerate(row):
                if not isinstance(cell, dict):
                    continue
                if all(
                    value in {stable_token(actual) for actual in ([cell.get(field)] + ([cell.get("ENG_name")] if field == "name" else []))}
                    for field, value in expected.items()
                ):
                    matches.append(cell_index)
            if explicit_cell_index is not None and explicit_cell_index in matches:
                cell_pick = explicit_cell_index
            elif len(matches) == 1:
                cell_pick = matches[0]
            else:
                return None, None
            current = row[cell_pick]
            resolved += f"/{index}/{cell_pick}"
            continue
        if not isinstance(current, list):
            return None, None
        if selector.isdigit():
            index = int(selector)
        else:
            expected = dict(part.split("=", 1) for part in selector.split(";") if "=" in part and not part.startswith("index="))
            explicit_index = next((part.split("=", 1)[1] for part in selector.split(";") if part.startswith("index=")), None)
            candidates = []
            for item_index, item in enumerate(current):
                if not isinstance(item, dict):
                    continue
                matches = True
                for field, value in expected.items():
                    actuals = [item.get(field)]
                    if field == "name":
                        actuals.append(item.get("ENG_name"))
                    if value not in {stable_token(actual) for actual in actuals}:
                        matches = False
                        break
                if matches:
                    candidates.append(item_index)
            if explicit_index is not None and int(explicit_index) in candidates:
                index = int(explicit_index)
            elif len(candidates) == 1:
                index = candidates[0]
            elif len(candidates) > 1 and "source" in expected:
                # Duplicate names (e.g. "Stokkvari" gallery + statblock): prefer the
                # candidate that also matches an expected "source" field when present.
                source_cands = [i for i in candidates if expected["source"] in {stable_token(current[i].get("source"))}]
                if len(source_cands) == 1:
                    index = source_cands[0]
                else:
                    # The analyser appends a qualifier for every id/name/source/page
                    # field present on the source entry, so the selector's field set
                    # identifies the entry exactly even among same-named siblings:
                    # e.g. of two "Dragon Type" features the page-bearing one emits
                    # "name=...;source=...;page=19" while its page-less sibling
                    # emits "name=...;source=...". When the name+source filter
                    # leaves several candidates, prefer the unique one whose own
                    # qualifier field set equals the selector's (page/id present on
                    # the item iff present in the selector).
                    selector_fields = set(expected)
                    exact_cands = [
                        i for i in source_cands
                        if ("page" in selector_fields) == (current[i].get("page") is not None)
                        and ("id" in selector_fields) == (current[i].get("id") is not None)
                    ]
                    if len(exact_cands) == 1:
                        index = exact_cands[0]
                    else:
                        return None, None
            elif len(candidates) > 1:
                # Duplicate names without a source hint: prefer the candidate under
                # which the NEXT path segment's key exists (e.g. the gallery with
                # "images" rather than a sibling statblock without them).
                remaining = path_segments(key_path)
                next_raw = remaining[remaining.index(raw) + 1] if remaining.index(raw) + 1 < len(remaining) else None
                next_key = re.match(r"[^\[\]]+", next_raw).group(0) if next_raw else None
                if next_key:
                    key_cands = [i for i in candidates
                                 if isinstance(current[i], dict) and next_key in current[i]]
                    if len(key_cands) == 1:
                        index = key_cands[0]
                    elif key_cands and next_key == "name":
                        # Leaf .name on duplicate-named nodes: the name values
                        # coincide by definition, so any candidate satisfies the
                        # substring check; pick the first.
                        index = key_cands[0]
                    else:
                        return None, None
                else:
                    return None, None
            else:
                return None, None
        if index >= len(current):
            return None, None
        current = current[index]
        resolved += f"/{index}"
    return resolved or "/", current


def resolve_job_target(root, key_path: str):
    """Resolve a JSON value, folding analyser-only embedded-tag suffixes to their parent string."""
    target_path, target_value = resolve_job_value(root, key_path)
    if target_path is not None:
        return target_path, target_value
    match = EMBEDDED_TAG_SUFFIX.search(key_path)
    if match:
        return resolve_job_value(root, key_path[: match.start()])
    return None, None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--target", type=Path)
    parser.add_argument("--mode", choices=("5et", "homebrew"), default="5et")
    args = parser.parse_args()

    source = args.source.resolve()
    config = {"metadata": {"mode": args.mode, "force": False, "byhand": False, "force_title": False}}
    infos = list(JsonAnalyser(read_only=True).invoke([str(source)], config=config))
    infos = list(JobNeedTranslateSetter().invoke(infos, config=config))
    if len(infos) != 1:
        parser.error(f"expected one analyser result, got {len(infos)}")

    target_data = None
    if args.target:
        target = args.target.resolve()
        target_data = json.loads(target.read_text(encoding="utf-8-sig"))

    # Source codes (e.g. "TTNSP") are machine identifiers, never translatable text; the
    # analyser still emits tag-segment sub-jobs for them, so exclude them like MACHINE_LEAF.
    # Matching is case-insensitive: in-text references use the lowercase form ("blaze|ar1")
    # while _meta declares "Ar1".
    source_codes = set()
    source_meta_json = json.loads(source.read_text(encoding="utf-8-sig"))
    for source_meta in source_meta_json.get("_meta", {}).get("sources", []):
        for field in ("json", "abbreviation"):
            value = source_meta.get(field)
            if isinstance(value, str):
                source_codes.add(value.lower())
    # Snapshot of only the file's OWN source codes (before dependencies and
    # test references are merged in), used to recognize entity tags that
    # route to another file.
    own_source_codes = set(source_codes)
    # Cross-file dependency source codes (_meta.dependencies values and
    # _test.references) are machine routing identifiers for files that are not
    # among this file's own _meta.sources; their bare form stays byte-identical
    # in every pipe field exactly like a declared source code, so exempt it too.
    for dep_values in source_meta_json.get("_meta", {}).get("dependencies", {}).values():
        if isinstance(dep_values, list):
            source_codes.update(str(v).lower() for v in dep_values if isinstance(v, str))
    for ref in source_meta_json.get("_test", {}).get("references", []):
        if isinstance(ref, str):
            source_codes.add(ref.lower())

    # Entity tags routing to a source outside this file's own _meta.sources
    # name entities the renderer must resolve from that other file. When the
    # localized corpus holds no Chinese name for the display text (job-level
    # known_translation is None) the external file is untranslated — e.g.
    # MCDM's "Strongholds & Followers" (source code SaF) referenced from
    # Arcadia Issue 8 as {@creature Princip|SaF} — so the entity has no
    # canonical Chinese name anywhere: the zh translation keeps the English
    # surface byte-identical (tag displays, retained statblock names) instead
    # of inventing a name the entity link cannot resolve to.
    external_entity_displays = set()
    for text in iter_json_strings(source_meta_json):
        for tag_match in EXTERNAL_ENTITY_TAG.finditer(text):
            route = tag_match.group("route").split("|")[0].strip()
            if route.lower() in own_source_codes:
                continue
            if not SOURCE_CODE_ROUTE.fullmatch(route):
                continue
            external_entity_displays.add(tag_match.group("display").strip())

    jobs = []
    residuals = []
    filename_jobs = []
    unresolved_paths = []
    for job in infos[0].job_list:
        item = {
            "uid": job.uid,
            "key_path": job.key_path,
            "entry_path": job.entry_path,
            "tag": job.tag,
            "english": job.en_str,
            "known_translation": job.cn_str,
            "need_translate": bool(job.need_translate),
        }
        jobs.append(item)
        if not job.key_path:
            filename_jobs.append(item)
            continue
        if args.target and isinstance(job.en_str, str):
            if job.en_str.lower() in source_codes:
                continue
            # A tag tokenizer artifact appends the closing bracket to a source
            # code ("@creature[名称|LLVessel]" emits sub-job "LLVessel]"); the
            # bracket-stripped token is still a machine routing code.
            if job.en_str.lower().rstrip("]") in source_codes:
                continue
            if VARIABLE_TOKEN.match(job.en_str):
                continue
            if VARIABLE_FORMULA.match(job.en_str) or VARIABLE_FORMULA_FUNCTION.match(job.en_str):
                continue
            if HEX_COLOR_TOKEN.match(job.en_str):
                continue
            # Free-standing dice-math expressions that mention the proficiency
            # bonus (monster ac[].condition "+ PB", hp.special "30 + 10 × PB")
            # stay byte-identical to the source: the renderer's dice tokenizer
            # only understands the literal "PB" token, and the repo keeps such
            # formulas untranslated. Same machine class as VARIABLE_TAGS math.
            if PB_FORMULA.fullmatch(job.en_str):
                continue
            if AT_VARIABLE_FORMULA.fullmatch(job.en_str):
                continue
            if FOUNDRY_TEMPLATE.fullmatch(job.en_str):
                continue
            if BYLINE_TOKEN.fullmatch(job.en_str):
                continue
            if CREDIT_ARTWORK.fullmatch(job.en_str):
                continue
            if CREDIT_HANDLE_LINE.fullmatch(job.en_str):
                continue
            if CREDIT_NAME_LINE.fullmatch(job.en_str) and "items[" in (job.key_path or ""):
                continue
            if HANDLE_TOKEN.fullmatch(job.en_str):
                continue
            if CONLANG_TOKEN.fullmatch(job.en_str):
                continue
            if CURRENCY_FULL.fullmatch(job.en_str):
                continue
            if UNIT_CODE.fullmatch(job.en_str):
                continue
            if DICE_LADDER.fullmatch(job.en_str):
                continue
            if MALFORMED_TAG_UID.search(job.uid or ""):
                continue
            plain_path, plain_value = resolve_job_value(target_data, job.key_path)
            target_path, target_value = resolve_job_target(target_data, job.key_path)
            if target_path is None and path_segments(job.key_path)[:1] == ["optionalFeatureTypes"]:
                # The analyser drops the "_meta" prefix on jobs anchored under
                # _meta.optionalFeatureTypes; retry once with the prefix restored.
                meta_key_path = "/_meta/" + job.key_path.lstrip("/")
                plain_path, plain_value = resolve_job_value(target_data, meta_key_path)
                target_path, target_value = resolve_job_target(target_data, meta_key_path)
            if target_path is None:
                unresolved_paths.append(item)
                continue
            # A tag-segment token job only folds to its parent string; a plain string
            # job resolves directly. Only token jobs may be machine-excluded.
            is_token_job = plain_path is None or not isinstance(plain_value, str)
            if is_token_job and is_machine_tag_field(job):
                continue
            if (
                item["known_translation"] is None
                and isinstance(job.en_str, str)
                and job.en_str.isascii()
                and job.en_str.strip() in external_entity_displays
            ):
                # Retained external-source entity name (see
                # external_entity_displays above): the referenced entity has
                # no Chinese name in any localized repository, so the English
                # surface in the target is a deliberate retention.
                continue
            if (
                is_token_job
                and item["known_translation"] is None
                and is_brand_domain_link(job, target_value)
            ):
                # {@link Display|url} whose display repeats the target site's
                # own domain brand is a site proper name kept verbatim.
                continue
            if (
                isinstance(target_value, str)
                and any(job.en_str.lower() in sc for sc in source_codes if sc)
            ):
                # An English fragment may survive only as part of a source-code
                # routing anchor (class name "Mesmer" inside "ADMesmer"), which
                # must stay byte-identical in every pipe field it occupies.
                stripped = target_value
                for sc in source_codes:
                    if sc:
                        stripped = re.sub(re.escape(sc), "", stripped, flags=re.IGNORECASE)
                if job.en_str.lower() not in stripped.lower():
                    continue
            # Routing pipe fields (index >= 1) are machine anchors that stay
            # byte-identical to filenames/source codes; English they contain
            # must not count as untranslated display text when a tag's
            # display (field 0) has already been localized. Bare pipe-suffixed
            # routing entries (classSpells "感知鲜血|kibblestasty:bms") carry the
            # same anchors without braces: for a pipe-field sub-job, project the
            # containing string down to its display segment (before the first
            # pipe) so undeclared dependency codes are not flagged as prose.
            uid_field = TAG_FIELD_UID.search(job.uid or "")
            if (
                uid_field
                and int(uid_field.group("field")) >= 1
                and isinstance(target_value, str)
                and "|" in target_value
            ):
                projected_value = target_value.split("|", 1)[0]
            elif isinstance(target_value, str):
                projected_value = TAG_DISPLAY_ONLY.sub(
                    lambda m: m.group(1), target_value
                )
            else:
                projected_value = target_value
            untranslated = job.en_str == target_value or (
                job.need_translate
                and isinstance(target_value, str)
                and job.en_str in projected_value
            )
            if untranslated and job.need_translate and not MACHINE_LEAF.search(job.key_path):
                if is_table_value_cell(job.en_str) or is_retained_species_name(job.en_str):
                    # Homebrew dynamic-table value cells (variable-substitution
                    # tokens, legend-defined compact codes, dice/currency
                    # composites) and retained pseudo-Latin species names are
                    # deliberate keeps, not untranslated display prose.
                    continue
                if (
                    item["known_translation"] is None
                    and is_bare_spell_routing_key(job.key_path, job.en_str)
                    and spell_absent_from_all_corpora(job.en_str)
                ):
                    # Author-referenced dead spell link (see
                    # spell_absent_from_all_corpora): no corpus defines the
                    # spell, so the English routing key is a deliberate
                    # source-defect mirror, not untranslated display prose.
                    continue
                residuals.append({**item, "target_paths": [target_path]})

    report = {
        "source": str(source),
        "target": str(args.target.resolve()) if args.target else None,
        "mode": args.mode,
        "job_count": len(jobs),
        "actionable_job_count": sum(1 for item in jobs if item["need_translate"]),
        "known_translation_job_count": sum(1 for item in jobs if isinstance(item["known_translation"], str)),
        "residual_count": len(residuals),
        "unresolved_path_count": len(unresolved_paths),
        "jobs": jobs,
        "filename_jobs": filename_jobs,
        "residuals": residuals,
        "unresolved_paths": unresolved_paths,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if residuals or unresolved_paths else 0


if __name__ == "__main__":
    raise SystemExit(main())
