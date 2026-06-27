#include "monster_action_database.hpp"
#include <algorithm>
#include <sstream>

namespace pf {
namespace {
MonsterActionRecord make(std::string id, std::string monster, std::string tier, std::string category,
                         std::string sub, std::string name, std::string direction, int frames,
                         int startup, int active, int recovery, std::string damage, std::string props) {
  const std::string prompt = "Pixel art " + monster + " action: " + name +
    ". 32x32 pixel sprite, 16-color palette, dark fantasy style, NEO-GEO aesthetic. " +
    "Direction: " + direction + ". Properties: " + props + ".";
  return {std::move(id), std::move(monster), std::move(tier), std::move(category), std::move(sub),
          std::move(name), prompt, std::move(direction), frames, startup, active, recovery,
          std::move(damage), std::move(props)};
}

void add(std::vector<MonsterActionRecord>& out, std::string id, std::string monster, std::string tier,
         std::string category, std::string sub, std::string name, std::string direction, int frames,
         int startup=-1, int active=-1, int recovery=-1, std::string damage="-", std::string props="-") {
  out.push_back(make(std::move(id), std::move(monster), std::move(tier), std::move(category),
                     std::move(sub), std::move(name), std::move(direction), frames,
                     startup, active, recovery, std::move(damage), std::move(props)));
}

std::vector<MonsterActionRecord> buildActions() {
  std::vector<MonsterActionRecord> a;
  a.reserve(146);

  add(a,"GBL-001","Goblin","Tier 1","Idle","Neutral","Idle","Front",12,-1,-1,-1,"-","Loop");
  add(a,"GBL-002","Goblin","Tier 1","Idle","Neutral","Idle (Crouched)","Front",8,-1,-1,-1,"-","Loop");
  add(a,"GBL-003","Goblin","Tier 1","Locomotion","Walk","Walk Forward","Side",8,-1,-1,-1,"-","Loop");
  add(a,"GBL-004","Goblin","Tier 1","Locomotion","Walk","Walk Backward","Side",8,-1,-1,-1,"-","Loop");
  add(a,"GBL-005","Goblin","Tier 1","Locomotion","Run","Run Away","Side",8,-1,-1,-1,"-","Loop");
  add(a,"GBL-006","Goblin","Tier 1","Locomotion","Jump","Hop","Front",6,-1,-1,-1,"-","Loop");
  add(a,"GBL-007","Goblin","Tier 1","Attack","Ranged","Dagger Throw","Front",45,15,20,10,"6","Boomerang");
  add(a,"GBL-008","Goblin","Tier 1","Attack","Ranged","Dagger Throw (Diagonal)","3/4",45,15,20,10,"6","Boomerang");
  add(a,"GBL-009","Goblin","Tier 1","Attack","Melee","Flailing Stab","Front",29,8,6,15,"4","-");
  add(a,"GBL-010","Goblin","Tier 1","Attack","Trap","Drop Coin","Front",80,10,60,10,"8","Explosive");
  add(a,"GBL-011","Goblin","Tier 1","Attack","Trap","Drop Coin (x3)","Front",90,8,60,5,"8 each","Explosive");
  add(a,"GBL-012","Goblin","Tier 1","Reaction","Hit","Hit Reaction","Front",15,-1,-1,15,"-","-");
  add(a,"GBL-013","Goblin","Tier 1","Reaction","Knockdown","Panic Dodge","Side",20,-1,-1,-1,"-","Invincible (10f)");
  add(a,"GBL-014","Goblin","Tier 1","Reaction","Knockdown","Knockdown","Front",30,-1,-1,30,"-","-");
  add(a,"GBL-015","Goblin","Tier 1","Emote","Taunt","Laugh","Front",20);
  add(a,"GBL-016","Goblin","Tier 1","Emote","Emote","Greedy Grasp","Front",15,-1,-1,-1,"-","Loop");
  add(a,"GBL-017","Goblin","Tier 1","Victory","Win","Victory Dance","Front",40,-1,-1,-1,"-","Loop");
  add(a,"GBL-018","Goblin","Tier 1","Defeat","Loss","Defeat - Cower","Front",40);

  add(a,"GBK-001","Goblin King","Tier 1 Boss","Idle","Neutral","Idle","Front",12,-1,-1,-1,"-","Loop");
  add(a,"GBK-002","Goblin King","Tier 1 Boss","Locomotion","Walk","Scurry","Side",8,-1,-1,-1,"-","Loop");
  add(a,"GBK-003","Goblin King","Tier 1 Boss","Locomotion","Run","Panic Run","Side",8,-1,-1,-1,"-","Loop");
  add(a,"GBK-004","Goblin King","Tier 1 Boss","Attack","Ranged","Boomerang Dagger","Front",47,12,25,10,"6","Boomerang");
  add(a,"GBK-005","Goblin King","Tier 1 Boss","Attack","Ranged","Boomerang Dagger (Angle)","3/4",47,12,25,10,"6","Boomerang");
  add(a,"GBK-006","Goblin King","Tier 1 Boss","Attack","Trap","Gold Coin Trap","Front",76,8,60,8,"10","Explosive");
  add(a,"GBK-007","Goblin King","Tier 1 Boss","Attack","Trap","Triple Coin Trap","Front",90,8,60,5,"10 each","Explosive");
  add(a,"GBK-008","Goblin King","Tier 1 Boss","Reaction","Hit","Hit Reaction","Front",15);
  add(a,"GBK-009","Goblin King","Tier 1 Boss","Reaction","Knockdown","Panic Dodge","Side",20,-1,-1,-1,"-","Invincible (15f)");
  add(a,"GBK-010","Goblin King","Tier 1 Boss","Reaction","Knockdown","Knockdown","Front",35);
  add(a,"GBK-011","Goblin King","Tier 1 Boss","AI Behavior","Greed","Greedy Charge","Side",40,10,10,20,"8","Greed Trigger");
  add(a,"GBK-012","Goblin King","Tier 1 Boss","Emote","Taunt","Greedy Laugh","Front",20);
  add(a,"GBK-013","Goblin King","Tier 1 Boss","Victory","Win","Victory Dance","Front",40,-1,-1,-1,"-","Loop");
  add(a,"GBK-014","Goblin King","Tier 1 Boss","Defeat","Loss","Defeat - Cower","Front",45);

  const char* orcNames[] = {"Idle","Idle (Guarding)","Walk Forward","Walk Forward (Diagonal)","Charge","Overhead Chop","Overhead Chop (Diagonal)","3-Hit Combo - Hit 1","3-Hit Combo - Hit 2","3-Hit Combo - Hit 3 (Finisher)","Block","Hit Reaction (Light)","Hit Reaction (Heavy)","Knockdown","Get Up","Roar","Chest Beat","Enrage Activation","Victory Roar","Defeat - Fall"};
  for (int i=0;i<20;i++) add(a,"ORC-" + (i+1<10?std::string("00"):std::string("0")) + std::to_string(i+1),"Orc Grunt","Tier 2", i<2?"Idle":i<5?"Locomotion":i<10?"Attack":i==10?"Defense":i<15?"Reaction":i<17?"Emote":i==17?"Special":i==18?"Victory":"Defeat", i<2?"Neutral":i<4?"Walk":i==4?"Run":i<7?"Heavy":i<10?"Combo":i==10?"Block":i<13?"Hit":i<15?"Knockdown":i<17?"Taunt":i==17?"Enrage":i==18?"Win":"Loss", orcNames[i], (i==3||i==6)?"3/4":(i==2||i==4?"Side":"Front"), i==1?50:(i==5||i==6?53:i==7?30:i==8?27:i==9?44:i==12?20:i==13?40:i==14?25:i==17?20:i==18?30:i==19?50:(i<5?8:(i==10?6: (i<17?20:12)))), i==5||i==6?22:i==7?15:i==8?12:i==9?18:-1, i==5||i==6?6:i==7||i==8?5:i==9?6:-1, i==5||i==6?25:i==7||i==8?10:i==9?20:i==12?20:i==14?25:-1, i==5||i==6?"15":i==7||i==8?"8":i==9?"12":"-", i==5||i==6?"Super Armor":i==9?"Parryable to Stagger":i==17?"Berserk":(i==0||i==1||i==18?"Loop":"-"));

  const char* orwNames[] = {"Idle","Walk Forward","Overhead Chop","Overhead Chop (Diagonal)","3-Hit Combo - Hit 1","3-Hit Combo - Hit 2","3-Hit Combo - Hit 3 (Parry Window)","Ground Slam (Shockwave)","Block","Hit Reaction (Light)","Hit Reaction (Heavy)","Knockdown","Get Up","Enrage Activation","Enrage Charge","Roar","Chest Beat","Victory Roar","Defeat - Fall"};
  for (int i=0;i<19;i++) add(a,"ORW-" + (i+1<10?std::string("00"):std::string("0")) + std::to_string(i+1),"Orc Warlord","Tier 2 Boss", i==0?"Idle":i==1?"Locomotion":i<8?"Attack":i==8?"Defense":i<13?"Reaction":i<15?"Special":i<17?"Emote":i==17?"Victory":"Defeat", i==0?"Neutral":i==1?"Walk":i<4?"Heavy":i<7?"Combo":i==7?"Ranged":i==8?"Block":i<11?"Hit":i<13?"Knockdown":i<15?"Enrage":i<17?"Taunt":i==17?"Win":"Loss", orwNames[i], (i==1||i==14)?"Side":(i==3?"3/4":"Front"), i==2||i==3?53:i==4?30:i==5?27:i==6?44:i==7?55:i==8?50:i==10?20:i==11?45:i==12?25:i==14?38:i==17?30:i==18?50:(i==0?12:20), i==2||i==3?22:i==4?15:i==5?12:i==6?18:i==7?20:i==14?8:-1, i==2||i==3||i==6?6:i==4||i==5?5:i==7||i==14?15:-1, i==2||i==3?25:i==4||i==5?10:i==6||i==7?20:i==14?15:-1, i==2||i==3?"20":i==4||i==5?"10":i==6||i==14?"15":i==7?"12":"-", i==2||i==3||i==8||i==9?"Super Armor":i==6?"Parryable to Stagger":i==7?"Ground Only":i==13||i==14?"Berserk":(i==0||i==17?"Loop":"-"));

  const char* sklNames[] = {"Idle","Shamble Forward","Side Dodge","Sword Slash","Sword Slash (Diagonal)","Sword Thrust","Hit Reaction","Shatter","Resurrect","Final Death"};
  for (int i=0;i<10;i++) add(a,"SKL-" + std::string("00") + std::to_string(i+1),"Skeleton","Tier 3", i==0?"Idle":i<3?"Locomotion":i<6?"Attack":i<9?"Reaction":"Defeat", i==0?"Neutral":i==1?"Walk":i==2?"Dash":i<6?"Melee":i==6?"Hit":i==7?"Knockdown":i==8?"Recovery":"Loss", sklNames[i], (i==1||i==2)?"Side":(i==4?"3/4":"Front"), i==3||i==4?32:i==5?26:i==6?12:i==7?30:i==8?25:i==9?40:(i==2?12:8), i==3||i==4?12:i==5?10:-1, i==3||i==4?5:i==5?4:-1, i==3||i==4?15:i==5?12:i==6?12:i==7?30:i==8?25:-1, i==3||i==4?"5":i==5?"4":"-", i==2?"Invincible (10f)":i==8?"Resurrection":(i==0||i==1?"Loop":"-"));

  const char* wyrNames[] = {"Idle (Grounded)","Hover","Dive Bomb","Fire Spit","Claw Swipe","Hit Reaction (Flight)","Crash Landing","Takeoff"};
  for (int i=0;i<8;i++) add(a,"WYR-" + std::string("00") + std::to_string(i+1),"Wyvern Hatchling","Tier 4", i==0?"Idle":i<3?"Locomotion":i<5?"Attack":i<8?"Reaction":"Defeat", i==0?"Neutral":i<3?"Flight":i==3?"Ranged":i==4?"Melee":i==5?"Hit":i==6?"Knockdown":"Recovery", wyrNames[i], i==1?"Side":"Front", i==2?30:i==3?37:i==4?24:i==5?15:i==6?25:i==7?15:12, i==2?10:i==3?12:i==4?8:-1, i==2?5:i==3?15:i==4?4:-1, i==2?15:i==3?10:i==4?12:i==5?15:i==6?25:i==7?15:-1, i==2?"6":i==3?"4":i==4?"5":"-", i==2?"Aerial":i==3?"Fire":(i<2?"Loop":"-"));

  const char* vsdNames[] = {"Idle","Float Forward","Phase Strike","Phase Out","Hit Reaction (Vulnerable)","Dissolve"};
  for (int i=0;i<6;i++) add(a,"VSD-" + std::string("00") + std::to_string(i+1),"Void Spawn","Tier 5", i==0?"Idle":i==1?"Locomotion":i==2?"Attack":i==3?"Defense":i==4?"Reaction":"Defeat", i==0?"Neutral":i==1?"Float":i==2?"Melee":i==3?"Phase":i==4?"Hit":"Loss", vsdNames[i], i==1?"Side":"Front", i==2?25:i==3?30:i==4?15:i==5?30:12, i==2?10:-1, i==2?5:-1, i==2?10:i==4?15:-1, i==2?"8":"-", i==0?"Loop, Invincible 50%":i==2?"Vulnerable during Active":i==3?"Invincible (30f)":(i==1?"Loop":"-"));

  const char* lchNames[] = {"Idle","Float Side","Teleport","Ground Spikes","Ground Spikes (Variant)","Homing Skull","Homing Skull (x3)","Life Drain Beam","Fake Cast","Hit Reaction (Flinch)","Hit Reaction (Heavy)","Magic Shield","Spell Rotation","Victory Float","Defeat - Crumbling"};
  for (int i=0;i<15;i++) add(a,"LCH-" + (i+1<10?std::string("00"):std::string("0")) + std::to_string(i+1),"Undead Lich","Tier 3 Boss", i==0?"Idle":i<3?"Locomotion":i<9?"Attack":i<11?"Reaction":i==11?"Defense":i==12?"AI Behavior":i==13?"Victory":"Defeat", i==0?"Neutral":i==1?"Float":i==2?"Teleport":i<8?"Magic":i==8?"Fake":i<11?"Hit":i==11?"Shield":i==12?"Rotation":i==13?"Win":"Loss", lchNames[i], i==1?"Side":"Front", i==2?30:i==3?55:i==4?70:i==5?70:i==6?90:i==7?85:i==8?20:i==9?15:i==10?25:i==11?10:i==12?40:i==13?40:i==14?50:12, i==2?10:i==3||i==4?30:i==5||i==6?20:i==7?10:-1, i==2?10:i==3?10:i==4?25:i==5?40:i==6?50:i==7?60:-1, i==2?10:i==3||i==4?15:i==5?10:i==6?5:i==7?15:i==9?15:i==10?25:-1, i==3?"8":i==4?"6 each":i==5?"10":i==6?"8 each":i==7?"1/frame":"-", i==2?"Invincible (10f)":i==3?"Ground Only, Jump Over":i==4?"Wave Pattern":i==5||i==6?"Tracking":i==7?"Channeled, Interruptible":i==8?"Bait":i==9?"Vulnerable Window":i==11?"Reflect":i==12?"Rotation":(i==0||i==13?"Loop":"-"));

  const char* drgNames[] = {"Idle (Grounded)","Takeoff","Hover","Land","Bite","Tail Swipe","Claw Swipe","Fireball Rain","Fireball Rain (Wave)","Flame Breath (Horizontal)","Flame Breath (Anti-Air)","Hit Reaction","Hit Reaction (Heavy)","Phase 1 - Grounded","Phase 2 - Flying","Phase 3 - Enraged","Victory Roar","Defeat - Collapse"};
  for (int i=0;i<18;i++) add(a,"DRG-" + (i+1<10?std::string("00"):std::string("0")) + std::to_string(i+1),"Elder Dragon","Tier 4 Boss", i==0?"Idle":i<4?"Locomotion":i<11?"Attack":i<13?"Reaction":i<16?"AI Behavior":i==16?"Victory":"Defeat", i==0?"Neutral":i<3?"Flight":i==3?"Landing":i<7?"Melee":i<9?"Ranged":i<11?"Special":i<13?"Hit":i<16?"Phase":i==16?"Win":"Loss", drgNames[i], i==5?"Side":"Front", i==1?50:i==3?40:i==4?44:i==5?53:i==6?36:i==7?60:i==8?85:i==9?165:i==10?60:i==11?15:i==12?25:i==16?40:i==17?60:(i==0||i==2?12:20), i==1?20:i==3?15:i==4?14:i==5?20:i==6?12:i==7||i==8?25:i==9?15:i==10?10:-1, i==1?20:i==3?15:i==4?10:i==5?8:i==6?6:i==7?15:i==8?40:i==9?120:i==10?30:-1, i==1||i==3?10:i==4?20:i==5?25:i==6?18:i==7||i==8?20:i==9?30:i==10?20:-1, i==4?"15":i==5?"12":i==6?"10":i==7||i==8?"8 each":i==9||i==10?"5/frame":"-", i==1||i==3?"Phase Transition":i==4?"Ground Only":i==5?"Behind Only":i==7?"AOE, Predictive":i==8?"Wave Pattern":i==9?"Ground Only, Anti-Air":i==10?"Aerial":i>=13&&i<=15?(i==15?"Enraged":"Pattern"):(i==0||i==2||i==16?"Loop":"-"));

  const char* aztNames[] = {"Idle (Glitch)","Walk (Copied)","Dash (Copied)","Copy Attack","Copy Special","Copy Combo","Reflect Shield","Command Grab","Zone Trap","Counter Parry","Block (Fast)","Hit Reaction","Knockdown","Data Aggregation","Tilt State","Search State","Victory Glitch","Defeat - Shatter"};
  for (int i=0;i<18;i++) add(a,"AZT-" + (i+1<10?std::string("00"):std::string("0")) + std::to_string(i+1),"Archdemon","Tier 5 Boss", i==0?"Idle":i<3?"Locomotion":i<10?"Attack":i==10?"Defense":i<13?"Reaction":i<16?"AI Behavior":i==16?"Victory":"Defeat", i==0?"Neutral":i==1?"Walk":i==2?"Dash":i<6?"Copy":i<10?"Special":i==10?"Block":i==11?"Hit":i==12?"Knockdown":i==13?"Adaptive":i==14?"Tilt":i==15?"Search":i==16?"Win":"Loss", aztNames[i], i==1||i==2?"Side":"Front", i==2?20:i==3||i==4?30:i==5?40:i==6?15:i==7?25:i==8?30:i==9?10:i==10?6:i==11?10:i==12?25:i==13||i==14?20:i==15?30:i==16?40:i==17?60:12, -1,-1, i==7?15:-1, i==6?"20":i==7||i==9?"15":i==8?"12":"-", i==0?"Loop, Mirror":i==2?"Speed Advantage":i>=3&&i<=5?"Copy":i==6?"Adaptive":i==7?"Unblockable, Mana Drain":i==8?"Predictive":i==9?"Parry":i==10?"Fast Recovery":i==13?"Adaptive":i==14?"Frustration":i==15?"Vulnerability":(i==16?"Loop":"-"));

  return a;
}

std::string cell(const std::string& s) {
  std::string out = s;
  std::replace(out.begin(), out.end(), '\t', ' ');
  std::replace(out.begin(), out.end(), '\n', ' ');
  return out;
}
}

const std::vector<MonsterActionRecord>& MonsterActionDatabase::actions() {
  static const std::vector<MonsterActionRecord> records = buildActions();
  return records;
}
std::vector<MonsterActionRecord> MonsterActionDatabase::byMonster(std::string_view monster) {
  std::vector<MonsterActionRecord> out;
  for (const auto& action : actions()) if (action.monster == monster) out.push_back(action);
  return out;
}
std::vector<MonsterActionRecord> MonsterActionDatabase::byCategory(std::string_view category) {
  std::vector<MonsterActionRecord> out;
  for (const auto& action : actions()) if (action.category == category) out.push_back(action);
  return out;
}
const MonsterActionRecord* MonsterActionDatabase::find(std::string_view actionId) {
  for (const auto& action : actions()) if (action.actionId == actionId) return &action;
  return nullptr;
}
std::string MonsterActionDatabase::toGoogleSheetsTsv() {
  std::ostringstream out;
  out << "Action ID\tMonster\tTier\tCategory\tSub-Category\tAction Name\tPrompt (Full)\tDirection\tFrame Count\tStartup (f)\tActive (f)\tRecovery (f)\tDamage\tSpecial Properties\n";
  for (const auto& a : actions()) {
    out << cell(a.actionId) << '\t' << cell(a.monster) << '\t' << cell(a.tier) << '\t' << cell(a.category) << '\t'
        << cell(a.subCategory) << '\t' << cell(a.actionName) << '\t' << cell(a.prompt) << '\t' << cell(a.direction) << '\t'
        << a.frameCount << '\t' << (a.startupFrames < 0 ? "-" : std::to_string(a.startupFrames)) << '\t'
        << (a.activeFrames < 0 ? "-" : std::to_string(a.activeFrames)) << '\t'
        << (a.recoveryFrames < 0 ? "-" : std::to_string(a.recoveryFrames)) << '\t'
        << cell(a.damage) << '\t' << cell(a.specialProperties) << '\n';
  }
  return out.str();
}
}
