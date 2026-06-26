#include "pixel_fury_content.hpp"
#include <stdexcept>

namespace pf {
namespace {
AnimationBeat beat(std::string name, int startup, int active, int recovery, int overshoot, float smear, std::string note) {
  return {std::move(name), startup, active, recovery, overshoot, smear, std::move(note)};
}

MovementModel movement(CharacterId id, float accel, float decel, float air, float water, int lag, std::string identity) {
  return {id, accel, decel, air, water, lag, std::move(identity)};
}

const std::array<CharacterBible, 6> kCharacters{{
  {CharacterId::Knight, "Knight", "Anvil", "Storm-grey steel, crimson cape, gold eye slits, chipped slab sword.", "1px breastplate inhale, 45f weight shift, 70f gauntlet squeeze.", "Marching inertia: shoulders lead, cape follows a full step behind.", "Indomitable: 40% HP grants 300f knockdown immunity.", movement(CharacterId::Knight, 2.4f/12.0f, 2.4f/8.0f, .60f, .65f, 9, "heavy oath-weighted acceleration"), {beat("Light Slash",5,3,8,1,.18f,"short gold eye flare"), beat("Shield Bash",12,4,20,3,.32f,"white shield bloom and 2px impact settle"), beat("Guard Step",6,8,6,2,.22f,"cape compresses then uncoils")}},
  {CharacterId::Assassin, "Assassin", "Razor", "Midnight leather, orange scarf, white hair, fang daggers.", "2px toe bounce, scanning head turns, 300f dagger flip.", "Low prowling circle with scarf settling over 120f.", "Mirage: three back-stabs unlock a delayed 1HP clone.", movement(CharacterId::Assassin, 4.4f/5.0f, 4.4f/7.0f, .65f, 1.45f, 14, "spring-loaded twitch movement"), {beat("Needle Jab",5,3,8,2,.24f,"thin dagger smear"), beat("Feint Step",4,6,6,4,.42f,"hurtbox curls to compact backflip"), beat("Shadow Swap",12,2,25,6,.55f,"eight purple crow silhouettes")}},
  {CharacterId::Mage, "Mage", "Conductor", "Floating indigo robe, gold constellations, cyan staff orb.", "Hover-still body with drifting constellations and hair sparkles.", "Frictionless glide; robe sweeps like underwater cloth.", "Spell Weave: every 10th cast duplicates the next spell.", movement(CharacterId::Mage, 2.8f/9.0f, 2.8f/6.0f, .80f, 1.25f, 18, "buoyant arcane hover"), {beat("Staff Tap",5,3,8,1,.18f,"orb pulse"), beat("Frost Nova",10,4,20,5,.38f,"expanding 360-degree ice ring"), beat("Arcane Orb",15,12,20,3,.44f,"slow orb with detonation anticipation")}},
  {CharacterId::Necromancer, "Necromancer", "Puppeteer", "Green-grey corpse, bone crown, femur staff, red pin eyes.", "Draft sway, ghost wisps, black cough miasma.", "Dragging shamble with a 1f hitch every fourth step.", "Death Burst: slain skeleton detonates for 150px AOE.", movement(CharacterId::Necromancer, 2.5f/10.0f, 2.5f/9.0f, .60f, .95f, 16, "rotted delayed puppet joints"), {beat("Bone Poke",5,3,8,1,.16f,"brittle wrist snap"), beat("Soul Leech",6,45,20,0,.30f,"4px green beam lifeline"), beat("Grave Risen",20,1,28,2,.36f,"ritual circle pulses under feet")}},
  {CharacterId::Paladin, "Paladin", "Wrecking Ball", "Silver rider on draft horse, blue-gold crest, long lance.", "Four-beat horse trot, nostril steam, rider neck pat.", "Continuous circling trot; turning uses 6f rear and 180-degree pivot.", "Last Vigil: horse throws rider, later tramples from behind.", movement(CharacterId::Paladin, 3.1f/11.0f, 3.1f/12.0f, .45f, .80f, 10, "mounted momentum with delayed pivot"), {beat("Lance Check",5,3,8,2,.20f,"pennant flutter"), beat("Holy Stampede",18,30,35,8,.60f,"full-screen horse charge"), beat("Aegis Aura",2,8,10,1,.28f,"gold bubble reflects projectile")}},
  {CharacterId::Warrior, "Warrior", "Barrage", "Scar mountain, glowing tattoos, twin torso-wide axes.", "Spit, neck crack, axe scrape, bulging pixel veins.", "Forward 30-degree stomp; each step creates 1px shockwave.", "Bloodrage: at 1% HP, cannot die for 600f.", movement(CharacterId::Warrior, 2.9f/8.0f, 2.9f/15.0f, .55f, 1.10f, 7, "unstoppable mass with sliding decel"), {beat("Axe Chop",5,3,8,3,.28f,"orange tattoo pop"), beat("Whirlwind",12,20,18,7,.58f,"four-hit steel vortex"), beat("Colossal Slam",13,8,21,9,.62f,"4f screen-freeze shockwave")}}
}};

const std::array<EnemyBible, 10> kEnemies{{
  {EnemyKind::Goblin,"Goblin","Horde","aggression spikes when player idles; fear spikes on heavy whiff punish","60% panic dodge check against recent player button press",{"rock wind-up","sideways roll crouch","yellow eye blink"}},
  {EnemyKind::GoblinKing,"Goblin King","Boss 1","greed overrides fear when gold is touched","drops coin traps and abandons spacing if treasure is stolen",{"coin toss","boomerang dagger shoulder roll","crown wobble"}},
  {EnemyKind::Orc,"Orc Grunt","Brute","patience dominates; guards on 120f/30f rhythm","records spam and holds block until recovery window",{"overhead axe lift","shield plant","breath snort"}},
  {EnemyKind::OrcWarlord,"Orc Warlord","Boss 2","super-armor patience check","only third-hit parry meaningfully staggers him",{"axe scrape","crowd cheer cue","third swing shoulder flash"}},
  {EnemyKind::Skeleton,"Skeleton","Plague","low fear, high persistence","resurrects once unless finished by heavy",{"rib rattle","green eye spark","bone reform"}},
  {EnemyKind::Lich,"Lich","Boss 3","chess-master patience with fake-cast baiting","vulnerable only on cast frames 15-25",{"page flutter","staff lift","fake-cast hand twitch"}},
  {EnemyKind::Wyvern,"Wyvern","Feral","aerial aggression with delayed dive commitment","predicts 3 seconds of hover before dive",{"wing tuck","shadow marker","screech frame"}},
  {EnemyKind::Dragon,"Elder Dragon","Boss 4","phase-based rage and predictive fire aim","aims 50px ahead during flight phase",{"lava crack pulse","wing eclipse","flame throat glow"}},
  {EnemyKind::VoidSpawn,"Void Spawn","Void","fearless phasing patience","damageable only after attack recovery",{"phase shimmer","white outline snap","void ripple"}},
  {EnemyKind::Archdemon,"Archdemon","Final Boss","300f tendency model with regret and tilt states","unlocks reflect, grab, zone trap, and search-glitch responses",{"sprite inversion","red-blue glitch floor","white slash eyes"}}
}};

const std::array<FloorBible, 25> kFloors{{
  {1,"Horde","Lower Warrens",EnemyKind::Goblin,false,false,.42f,"teach spacing with two goblin lanes"},
  {2,"Horde","Torch Gutters",EnemyKind::Goblin,false,false,.45f,"introduce rock throw crossfire"},
  {3,"Horde","Split Stair",EnemyKind::Goblin,false,false,.48f,"increase panic-dodge response"},
  {4,"Horde","Gold Antechamber",EnemyKind::Goblin,false,false,.52f,"perfect-run detector arms veteran flag"},
  {5,"Horde","Goblin Warrens",EnemyKind::GoblinKing,true,false,.62f,"veteran doubles boss HP and enables triple dagger"},
  {6,"Brute","Iron Sand Gate",EnemyKind::Orc,false,false,.50f,"teach guard rhythm"},
  {7,"Brute","Broken Arena",EnemyKind::Orc,false,false,.54f,"mix guard and delayed chop"},
  {8,"Brute","Spiked Hall",EnemyKind::Orc,false,false,.58f,"punish repeated jump-ins"},
  {9,"Brute","Crowd Tunnel",EnemyKind::Orc,false,false,.62f,"prime parry timing"},
  {10,"Brute","Spiked Colosseum",EnemyKind::OrcWarlord,true,true,.70f,"boss plus bonfire stat spend"},
  {11,"Plague","Bone Steps",EnemyKind::Skeleton,false,false,.50f,"teach heavy finish"},
  {12,"Plague","Green Mist Stacks",EnemyKind::Skeleton,false,false,.54f,"add projectile dodge skeleton"},
  {13,"Plague","Candle Ossuary",EnemyKind::Skeleton,false,false,.58f,"resurrection pressure"},
  {14,"Plague","Silent Index",EnemyKind::Skeleton,false,false,.62f,"target prioritization check"},
  {15,"Plague","Dark Library",EnemyKind::Lich,true,false,.72f,"fake-cast interrupt duel"},
  {16,"Feral","Ash Rafters",EnemyKind::Wyvern,false,false,.55f,"teach anti-air timing"},
  {17,"Feral","Steam Ribcage",EnemyKind::Wyvern,false,false,.59f,"steam occludes dive tell"},
  {18,"Feral","Magma Bridge",EnemyKind::Wyvern,false,false,.63f,"predictive dive lanes"},
  {19,"Feral","Obsidian Perch",EnemyKind::Wyvern,false,false,.67f,"pre-boss aerial exam"},
  {20,"Feral","Volcano Heart",EnemyKind::Dragon,true,true,.80f,"three-phase dragon plus bonfire"},
  {21,"Void","Starved Stair",EnemyKind::VoidSpawn,false,false,.60f,"teach reactive patience"},
  {22,"Void","Inverted Gallery",EnemyKind::VoidSpawn,false,false,.64f,"phase timing mixups"},
  {23,"Void","Null Choir",EnemyKind::VoidSpawn,false,false,.68f,"multiple recovery windows"},
  {24,"Void","Celestial Door",EnemyKind::VoidSpawn,false,false,.72f,"final patience rehearsal"},
  {25,"Void","Celestial Spire Glitched",EnemyKind::Archdemon,true,false,.95f,"300f tendency model final exam"}
}};

const std::array<AudioPatch, 6> kAudio{{
  {"impact_light","square",360.f,0.0f,66.7f,"light hit crunch on active frame"},
  {"impact_heavy","square",90.f,0.0f,66.7f,"heavy counter-hit and KO freeze"},
  {"whoosh_pre_hit","noise",900.f,0.0f,33.3f,"plays two frames before active hitbox"},
  {"grunt_chip","pulse",220.f,4.0f,100.f,"damage-scaled pain chirp"},
  {"timer_click","sine",600.f,0.0f,16.7f,"36-second UI heartbeat"},
  {"panic_tick","sine",1200.f,0.0f,16.7f,"last-three-second staccato warning"}
}};
}

const std::array<CharacterBible, 6>& ContentRegistry::characters() { return kCharacters; }
const std::array<EnemyBible, 10>& ContentRegistry::enemies() { return kEnemies; }
const std::array<FloorBible, 25>& ContentRegistry::floors() { return kFloors; }
const std::array<AudioPatch, 6>& ContentRegistry::audioPatches() { return kAudio; }

const CharacterBible& ContentRegistry::character(CharacterId id) {
  for (const auto& c : kCharacters) if (c.id == id) return c;
  throw std::out_of_range("unknown character bible id");
}
const EnemyBible& ContentRegistry::enemy(EnemyKind kind) {
  for (const auto& e : kEnemies) if (e.kind == kind) return e;
  throw std::out_of_range("unknown enemy bible kind");
}
const FloorBible& ContentRegistry::floor(int floorNumber) {
  if (floorNumber < 1 || floorNumber > static_cast<int>(kFloors.size())) throw std::out_of_range("floor must be 1..25");
  return kFloors[static_cast<std::size_t>(floorNumber - 1)];
}
}
