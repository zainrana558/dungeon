#include "character_action_database.hpp"
#include <algorithm>
#include <sstream>

namespace pf {
namespace {
CharacterActionRecord action(std::string id, std::string character, std::string category, std::string sub,
                             std::string name, std::string prompt, std::string direction, int frames,
                             int startup=-1, int active=-1, int recovery=-1, std::string damage="-", std::string props="-") {
  return {std::move(id), std::move(character), std::move(category), std::move(sub), std::move(name),
          std::move(prompt), std::move(direction), frames, startup, active, recovery, std::move(damage), std::move(props)};
}

std::string prompt(const std::string& character, const std::string& name, const std::string& detail, const std::string& direction, const std::string& props) {
  return "Pixel art " + character + " action: " + name + ". " + detail +
    " 32x32 pixel sprite, 16-color palette, dark fantasy style, NEO-GEO aesthetic. Direction: " +
    direction + ". Properties: " + props + ".";
}

void add(std::vector<CharacterActionRecord>& out, std::string id, std::string character, std::string category,
         std::string sub, std::string name, std::string detail, std::string direction, int frames,
         int startup=-1, int active=-1, int recovery=-1, std::string damage="-", std::string props="-") {
  out.push_back(action(std::move(id), character, std::move(category), std::move(sub), name,
                       prompt(character, name, std::move(detail), direction, props), std::move(direction),
                       frames, startup, active, recovery, std::move(damage), std::move(props)));
}

std::vector<CharacterMasterRecord> buildCharacters() {
  return {
    {"KNT","Knight","Anvil","Weathered storm-grey steel plate, tattered crimson cloak, great helm with gold eye pinpricks, slab sword, kite shield.","#2A2B2E, #6B6E75, #8B1C24, #F4D03F, #E8DCC4","32x32","dark fantasy, NEO-GEO, 16-color, pixel art"},
    {"ASN","Assassin","Razor","Sharp midnight-purple leather, blood-orange scarf, shock-white cropped hair, fang daggers, no armor.","#1B0F24, #3C1A4D, #C0C0C0, #D94A38, #FCE6C8","32x32","dark fantasy, NEO-GEO, 16-color, pixel art"},
    {"MGE","Mage","Conductor","Indigo hovering robe with gold constellations, white underwater hair, cyan heartbeat orb staff, blue afterglow.","#1A0A3E, #2D1B69, #00D4FF, #FFD700, #F0E6FF","32x32","dark fantasy, NEO-GEO, 16-color, pixel art"},
    {"NCR","Necromancer","Puppeteer","Emaciated green-grey corpse, bone crown, femur staff, green skull, tattered black robe, ghost wisps.","#1A2A1A, #3A4A3A, #00FF44, #8B0000, #2A1A0A","32x32","dark fantasy, NEO-GEO, 16-color, pixel art"},
    {"PLD","Paladin","Wrecking Ball","Mounted silver paladin with blue-gold sun crest, eagle-wing helm, lance, draft horse with sparking shoes.","#C0C0C0, #1A3A6A, #FFD700, #8B4513, #F5F5DC","32x32","dark fantasy, NEO-GEO, 16-color, pixel art"},
    {"WAR","Warrior","Barrage","Scarred bare-chested giant, shaved head, wild beard, orange ritual tattoos, twin enormous axes, fur pants.","#8B4513, #D2691E, #FF4500, #2A1A0A, #F5DEB3","32x32","dark fantasy, NEO-GEO, 16-color, pixel art"}
  };
}

void addKnight(std::vector<CharacterActionRecord>& a) {
  add(a,"KNT-001","Knight","Idle","Neutral","Idle","Storm-grey armor, crimson cloak, gold eyes, 1px breathing chest, 3-second weight shift.","Front",12,-1,-1,-1,"-","Loop");
  add(a,"KNT-002","Knight","Idle","Neutral","Idle (Crouching)","Lowered shielded stance with sword horizontal and cloak pooling behind.","Front",8,-1,-1,-1,"-","Loop");
  add(a,"KNT-003","Knight","Idle","Neutral","Idle (Back View)","Back view showing tattered cloak, sword hilt, strapped shield, rear helm silhouette.","Back",12,-1,-1,-1,"-","Loop");
  add(a,"KNT-004","Knight","Locomotion","Walk","Walk Forward","Heavy side-view march, cloak lags one step, each footstep shakes ground 1px.","Side",8,-1,-1,-1,"-","Loop");
  add(a,"KNT-005","Knight","Locomotion","Walk","Walk Forward (Diagonal)","45-degree march, shield angled to movement, cloak trailing.","3/4",8,-1,-1,-1,"-","Loop");
  add(a,"KNT-006","Knight","Locomotion","Walk","Walk Backward","Cautious backward walk with shield high and sword pointed defensively.","Side",8,-1,-1,-1,"-","Loop");
  add(a,"KNT-007","Knight","Locomotion","Run","Run Forward","Heavy jog, armor clanking, cloak streaming, shield lowered for speed.","Side",8,-1,-1,-1,"-","Loop");
  add(a,"KNT-008","Knight","Locomotion","Dash","Guard Step (Dash Forward)","Sudden shield-first lunge with white projectile-immunity flash.","Side",20,6,8,6,"-","Projectile Immune");
  add(a,"KNT-009","Knight","Locomotion","Jump","Jump (Straight Up)","Vertical leap with armor clank, upward cloak billow, sword raised overhead.","Front",10);
  add(a,"KNT-010","Knight","Attack","Light","Jab (Light Attack)","Quick straight sword thrust from guard; chest-height hitbox and fast recovery.","Front",18,5,3,10,"4","-");
  add(a,"KNT-011","Knight","Attack","Light","Jab (Side View)","Profile sword thrust with arm extended and shield guarding chest.","Side",18,5,3,10,"4","-");
  add(a,"KNT-012","Knight","Attack","Heavy","Overhead Slam","Sword raised high then slammed vertically with impact shake.","Front",35,13,4,18,"12","Guard Break");
  add(a,"KNT-013","Knight","Attack","Special","Shield Bash","Shoulder-tucked lunging bash, shield glowing white, frame-trap on block.","Side",36,12,4,20,"12","Stun (15f), Frame Trap");
  add(a,"KNT-014","Knight","Attack","Combo","Lance Charge - Frame 1 (Low)","First combo hit: low thrust with compressed shoulders.","Side",12,6,3,3,"6","-");
  add(a,"KNT-015","Knight","Attack","Combo","Lance Charge - Frame 2 (Mid)","Second combo hit: mid thrust carrying weight forward.","Side",12,5,3,4,"6","-");
  add(a,"KNT-016","Knight","Attack","Combo","Lance Charge - Frame 3 (Overhead Slam)","Finisher overhead slam that breaks guards.","Side",35,10,4,21,"10","Guard Break");
  add(a,"KNT-017","Knight","Defense","Block","Block (High)","Shield raised to chest/head height with sword angled behind.","Front",6,-1,-1,-1,"-","Loop");
  add(a,"KNT-018","Knight","Defense","Block","Block (Low)","Crouched low shield cover protecting legs.","Front",6,-1,-1,-1,"-","Loop");
  add(a,"KNT-019","Knight","Reaction","Hit","Hit Reaction - Light","Light flinch stepping back 1px with shield jerk.","Front",10,-1,-1,10,"-","-");
  add(a,"KNT-020","Knight","Reaction","Hit","Hit Reaction - Heavy","Heavy stagger moving 2-3px with armor clank.","Front",20,-1,-1,20,"-","-");
  add(a,"KNT-021","Knight","Reaction","Knockdown","Knockdown","Falling backward, sword flying loose, shield separating.","Front",30,-1,-1,30,"-","-");
  add(a,"KNT-022","Knight","Reaction","Recovery","Get Up","Planting sword and pushing up from knockdown.","Front",15,-1,-1,15,"-","-");
  add(a,"KNT-023","Knight","Special","Hidden Ability","Indomitable - Activation","Gold aura traces silhouette as shoulders straighten and eyes brighten.","Front",10,-1,-1,-1,"-","Gold Aura");
  add(a,"KNT-024","Knight","Special","Hidden Ability","Indomitable - Walking","Gold aura overlay, reduced 0.8px/f walk, hyper-armor posture.","Front",8,-1,-1,-1,"-","Hyper-Armor");
  add(a,"KNT-025","Knight","Special","Hidden Ability","Indomitable - Blocking","Takes hit without flinching; aura flashes and only pushback applies.","Front",8,-1,-1,-1,"-","Hyper-Armor");
  add(a,"KNT-026","Knight","Emote","Taunt","Taunt - Challenge","Slaps shield with sword for a metallic clang.","Front",20);
  add(a,"KNT-027","Knight","Emote","Taunt","Taunt - Weapon Plant","Plants sword and rests both hands on pommel.","Front",15,-1,-1,-1,"-","Loop");
  add(a,"KNT-028","Knight","Victory","Win","Victory Pose","Kneels, plants sword, bows head, cloak drapes forward in prayer.","Front",60,-1,-1,-1,"-","Loop");
  add(a,"KNT-029","Knight","Defeat","Loss","Defeat Pose","Falls to one knee, eyes flicker, reaches for sword, collapses face-first.","Front",45);
  add(a,"KNT-030","Knight","Defeat","Continue","Continue Screen","Slumped against wall, chest breathing, eyes dim but alive.","Front",30,-1,-1,-1,"-","Loop");
}

void addTemplateCharacter(std::vector<CharacterActionRecord>& a, const CharacterMasterRecord& c) {
  const std::string prefix = c.characterId;
  const std::string& name = c.characterName;
  const std::vector<CharacterActionRecord> knight = []{ std::vector<CharacterActionRecord> k; addKnight(k); return k; }();
  for (std::size_t i = 0; i < knight.size(); ++i) {
    auto row = knight[i];
    row.actionId = prefix + "-" + (i + 1 < 10 ? "00" : "0") + std::to_string(i + 1);
    row.character = name;
    row.prompt = prompt(name, row.actionName, c.basePrompt + " Adapt this motion to the character's unique silhouette, physics identity, cloth/weapon lag, and hidden ability.", row.direction, row.specialProperties);
    if (name == "Assassin" && row.category == "Locomotion") row.specialProperties = row.specialProperties == "-" ? "Scarf Lag" : row.specialProperties + ", Scarf Lag";
    if (name == "Mage" && row.category == "Locomotion") row.specialProperties = row.specialProperties == "-" ? "Hover" : row.specialProperties + ", Hover";
    if (name == "Necromancer" && row.category == "Special") row.specialProperties = row.specialProperties == "-" ? "Soul Magic" : row.specialProperties + ", Soul Magic";
    if (name == "Paladin" && row.category == "Locomotion") row.specialProperties = row.specialProperties == "-" ? "Mounted" : row.specialProperties + ", Mounted";
    if (name == "Warrior" && row.category == "Attack") row.specialProperties = row.specialProperties == "-" ? "Heavy Momentum" : row.specialProperties + ", Heavy Momentum";
    a.push_back(std::move(row));
  }
}

std::vector<CharacterActionRecord> buildActions() {
  std::vector<CharacterActionRecord> a;
  a.reserve(180);
  addKnight(a);
  const auto masters = buildCharacters();
  for (std::size_t i = 1; i < masters.size(); ++i) addTemplateCharacter(a, masters[i]);
  return a;
}

std::string cell(std::string s) {
  std::replace(s.begin(), s.end(), '\t', ' ');
  std::replace(s.begin(), s.end(), '\n', ' ');
  return s;
}
}

const std::vector<CharacterActionRecord>& CharacterActionDatabase::actions() {
  static const std::vector<CharacterActionRecord> records = buildActions();
  return records;
}
const std::vector<CharacterMasterRecord>& CharacterActionDatabase::characters() {
  static const std::vector<CharacterMasterRecord> records = buildCharacters();
  return records;
}
std::vector<CharacterActionRecord> CharacterActionDatabase::byCharacter(std::string_view character) {
  std::vector<CharacterActionRecord> out;
  for (const auto& row : actions()) if (row.character == character) out.push_back(row);
  return out;
}
std::vector<CharacterActionRecord> CharacterActionDatabase::byCategory(std::string_view category) {
  std::vector<CharacterActionRecord> out;
  for (const auto& row : actions()) if (row.category == category) out.push_back(row);
  return out;
}
const CharacterActionRecord* CharacterActionDatabase::find(std::string_view actionId) {
  for (const auto& row : actions()) if (row.actionId == actionId) return &row;
  return nullptr;
}
std::string CharacterActionDatabase::actionsToGoogleSheetsTsv() {
  std::ostringstream out;
  out << "Action ID\tCharacter\tCategory\tSub-Category\tAction Name\tPrompt (Full)\tDirection\tFrame Count\tStartup (f)\tActive (f)\tRecovery (f)\tDamage\tSpecial Properties\n";
  for (const auto& a : actions()) {
    out << cell(a.actionId) << '\t' << cell(a.character) << '\t' << cell(a.category) << '\t' << cell(a.subCategory) << '\t'
        << cell(a.actionName) << '\t' << cell(a.prompt) << '\t' << cell(a.direction) << '\t' << a.frameCount << '\t'
        << (a.startupFrames < 0 ? "-" : std::to_string(a.startupFrames)) << '\t'
        << (a.activeFrames < 0 ? "-" : std::to_string(a.activeFrames)) << '\t'
        << (a.recoveryFrames < 0 ? "-" : std::to_string(a.recoveryFrames)) << '\t'
        << cell(a.damage) << '\t' << cell(a.specialProperties) << '\n';
  }
  return out.str();
}
std::string CharacterActionDatabase::charactersToGoogleSheetsTsv() {
  std::ostringstream out;
  out << "Character ID\tCharacter Name\tCodename\tBase Prompt\tPalette\tSprite Size\tStyle Keywords\n";
  for (const auto& c : characters()) {
    out << cell(c.characterId) << '\t' << cell(c.characterName) << '\t' << cell(c.codename) << '\t'
        << cell(c.basePrompt) << '\t' << cell(c.palette) << '\t' << cell(c.spriteSize) << '\t' << cell(c.styleKeywords) << '\n';
  }
  return out.str();
}
}
