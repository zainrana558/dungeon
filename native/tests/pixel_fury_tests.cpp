#include "pixel_fury.hpp"
#include "pixel_fury_content.hpp"
#include <cassert>
#include <iostream>
int main(){
  pf::InputBuffer in; in.push(pf::Button::Light,true,100); assert(in.buffered(pf::Button::Light,105)); assert(!in.buffered(pf::Button::Light,111));
  for(auto id:{pf::CharacterId::Knight,pf::CharacterId::Assassin,pf::CharacterId::Mage,pf::CharacterId::Necromancer,pf::CharacterId::Paladin,pf::CharacterId::Warrior}){ auto s=pf::makeSpec(id); assert(!s.name.empty()); assert(s.light.startup==5 && s.heavy.recovery==21); }
  pf::DifficultyDirector d; pf::Tower t(d); assert(t.spawn(25).front().kind==pf::EnemyKind::Archdemon); d.recordFloorClear(true); d.recordFloorClear(true); d.recordFloorClear(true); d.recordFloorClear(true); assert(d.veteran());
  pf::Fighter f(pf::makeSpec(pf::CharacterId::Warrior)); f.hp=1; f.tick(in,120); assert(f.hiddenActive);
  pf::EnemyAI ai{pf::EnemyKind::Archdemon}; for(int i=0;i<20;i++) ai.observe(pf::Button::Special); assert(ai.decide(25,f,0)=="REFLECT_STANCE");
  pf::VerletCloth c; c.makeCape({0,0},4,4,4); c.simulate({10,0},.1f); assert(c.points().size()==16);
  pf::SynthAudio a; assert(a.hitLayers("heavy",20).size()==3);
  assert(pf::ContentRegistry::characters().size()==6);
  assert(pf::ContentRegistry::enemies().size()==10);
  assert(pf::ContentRegistry::floors().size()==25);
  assert(pf::ContentRegistry::floor(25).primary==pf::EnemyKind::Archdemon);
  assert(pf::ContentRegistry::character(pf::CharacterId::Mage).movement.airControlRatio>.75f);
  assert(pf::ContentRegistry::enemy(pf::EnemyKind::Archdemon).memoryRule.find("reflect")!=std::string::npos);
  assert(pf::ContentRegistry::audioPatches().size()==6);
  std::cout << "pixel_fury_tests passed\n";
}
