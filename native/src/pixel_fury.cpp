#include "pixel_fury.hpp"
#include <algorithm>
#include <cmath>
#include <numeric>
#include <stdexcept>

namespace pf {
bool Rect::overlaps(const Rect& r) const { return x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y; }
void InputBuffer::push(Button b, bool p, int f){ events_.push_back({b,p,f}); while(!events_.empty() && f-events_.front().frame>120) events_.pop_front(); }
bool InputBuffer::buffered(Button b,int now,int frames) const { int seen=0; for(auto it=events_.rbegin();it!=events_.rend();++it){ if(now-it->frame>frames) break; if(it->pressed) ++seen; if(it->button==b && it->pressed && !(seen==5||seen==6)) return true;} return false; }
bool InputBuffer::released(Button b,int now,int frames) const { return std::any_of(events_.rbegin(),events_.rend(),[&](auto&e){return now-e.frame<=frames&&e.button==b&&!e.pressed;}); }
int InputBuffer::pressesInWindow(int now,int frames) const { return std::count_if(events_.begin(),events_.end(),[&](auto&e){return e.pressed&&now-e.frame<=frames;}); }

void VerletCloth::makeCape(Vec2 a,int w,int h,float s){ points_.clear(); sticks_.clear(); rowWidth_=w; for(int y=0;y<h;y++)for(int x=0;x<w;x++) points_.push_back({{a.x+x*s,a.y+y*s},{a.x+x*s,a.y+y*s},y==0}); for(int y=0;y<h;y++)for(int x=0;x<w;x++){ int i=y*w+x; if(x) sticks_.push_back({i-1,i,s}); if(y) sticks_.push_back({i-w,i,s}); }}
void VerletCloth::simulate(Vec2 a,float wind,int its){ if(points_.empty())return; for(int i=0;i<rowWidth_;++i){points_[i].pos={a.x+i*4.f,a.y}; points_[i].prev=points_[i].pos;} for(auto& p:points_) if(!p.pinned){ Vec2 v{p.pos.x-p.prev.x,p.pos.y-p.prev.y}; p.prev=p.pos; p.pos.x+=v.x+wind; p.pos.y+=v.y+0.35f;} for(int k=0;k<its;k++) for(auto&s:sticks_){auto&a=points_[s.a];auto&b=points_[s.b]; float dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=std::max(0.001f,std::sqrt(dx*dx+dy*dy)); float diff=(d-s.length)/d*.5f; if(!a.pinned){a.pos.x+=dx*diff; a.pos.y+=dy*diff;} if(!b.pinned){b.pos.x-=dx*diff; b.pos.y-=dy*diff;}} }
std::vector<SynthEvent> SynthAudio::hitLayers(const std::string&w,int dmg) const { float base=w=="heavy"?90.f:360.f; return {{"whoosh_noise",900.f,2.f/kFps,.16f},{"impact_square",base,4.f/kFps,.55f},{"grunt_chip",220.f+dmg*18.f,6.f/kFps,.25f}}; }
SynthEvent SynthAudio::timerClick(int s) const { return {s<=3?"panic_tick":"timer_click", s<=3?1200.f:600.f, 1.f/kFps, s<=10?.35f:.12f}; }

FighterSpec makeSpec(CharacterId id){
  AttackDef light{"Fibonacci Light",5,3,8,7,34,14,2}, heavy{"Fibonacci Heavy",13,8,21,16,48,20,5};
  switch(id){
    case CharacterId::Knight: return {id,"Knight","Anvil",120,2.4f,.6f,12,8,light,heavy,{"Shield Bash",12,4,20,18,44,22,4,false,true},{"Guard Step",6,8,6,0,0,0,0,false,true}};
    case CharacterId::Assassin: return {id,"Assassin","Razor",85,4.4f,.65f,5,7,light,heavy,{"Shadow Swap",12,2,25,14,80,12,1,true},{"Feint Step",4,6,6,0}};
    case CharacterId::Mage: return {id,"Mage","Conductor",90,2.8f,.8f,9,6,light,heavy,{"Arcane Orb / Frost Nova",15,12,20,25,120,60,0,true,false,true},{"Float Step",5,10,4,0}};
    case CharacterId::Necromancer: return {id,"Necromancer","Puppeteer",95,2.5f,.6f,10,9,light,heavy,{"Soul Leech / Grave Risen",6,45,20,1,180,4,0,true,false,false,true},{"Phase",1,12,3,0}};
    case CharacterId::Paladin: return {id,"Paladin","Wrecking Ball",130,3.1f,.45f,11,12,light,heavy,{"Holy Stampede / Aegis",18,30,35,30,220,20,7,false,false,false,false,true},{"Cantabrian Circle",6,10,8,0}};
    case CharacterId::Warrior: return {id,"Warrior","Barrage",140,2.9f,.55f,8,15,light,heavy,{"Whirlwind / Colossal Slam",12,20,18,20,80,50,6},{"Rage Dash",5,9,15,0}};
  } throw std::logic_error("bad hero"); }
Fighter::Fighter(FighterSpec s):spec(std::move(s)),hp(spec.maxHp){ cloth.makeCape({pos.x,pos.y},4,7,4); }
void Fighter::startAttack(const AttackDef&a){ if(phase==Phase::Idle){current=a; phase=Phase::Startup; phaseFrame=0; if(a.projectile||a.freeze||a.summon) spellCasts++;}}
void Fighter::tick(const InputBuffer&i,int frame){ phaseFrame++; updateHidden(); float target=(i.buffered(Button::Right,frame,1)-i.buffered(Button::Left,frame,1))*spec.walkSpeed; float frames=std::abs(target)>0?spec.accelFrames:spec.decelFrames; vel.x += (target-vel.x)*(1-std::exp(-1.f/frames)); pos.x+=vel.x; if(phase==Phase::Startup&&phaseFrame>=current.startup){phase=Phase::Active;phaseFrame=0;} else if(phase==Phase::Active&&phaseFrame>=current.active){phase=Phase::Recovery;phaseFrame=0;} else if(phase==Phase::Recovery&&phaseFrame>=current.recovery){phase=Phase::Idle;phaseFrame=0;} cloth.simulate({pos.x+(facingRight?-6.f:30.f),pos.y+4}, std::sin(frame*.05f)*.05f); }
Rect Fighter::hurtbox() const{return {pos.x,pos.y,32,48};}
std::optional<Rect> Fighter::hitbox() const{ if(phase!=Phase::Active)return {}; return Rect{pos.x+(facingRight?28:-current.range),pos.y+12,current.range,current.radius};}
void Fighter::takeDamage(int a,bool c){ if(hiddenActive && spec.id==CharacterId::Warrior) return; hp=std::max(0.f,hp-a*(c?1.5f:1.f)); phase=hp<=0?Phase::Dead:Phase::Hitstun; phaseFrame=0; }
void Fighter::updateHidden(){ if(hiddenActive&&--hiddenTimer<=0) hiddenActive=false; if(!hiddenActive){ float r=hp/spec.maxHp; if((spec.id==CharacterId::Knight&&r<=.4f)||(spec.id==CharacterId::Paladin&&r<=.15f)||(spec.id==CharacterId::Warrior&&r<=.01f)){hiddenActive=true; hiddenTimer= spec.id==CharacterId::Warrior?600:300;}} }

void EnemyAI::observe(Button b){ playerHistory.push_back(b); if(playerHistory.size()>300)playerHistory.pop_front(); }
std::string EnemyAI::decide(int floor,const Fighter&p,int frame){ auto count=[&](Button b){return std::count(playerHistory.begin(),playerHistory.end(),b);}; if(kind==EnemyKind::Archdemon){ if(count(Button::Special)>18) return "REFLECT_STANCE"; if(count(Button::Block)>35){drives.frustration+=.1f; return drives.frustration>1?"TILT_WILD_HEAVY":"GRAB_ATTEMPT";} if(count(Button::Up)+count(Button::Right)>55) return "ZONE_TRAP"; if(std::abs(p.vel.x)>0 && count(Button::Light)+count(Button::Heavy)+count(Button::Special)==0){ if(++searchFrames>=60) return "SEARCH_GLITCH_OPENING";} else searchFrames=0; } if(kind==EnemyKind::Goblin && drives.fear>.5f) return "PANIC_DODGE"; if(floor%5==0) return "BOSS_PATTERN"; return drives.aggression>drives.patience?"ATTACK":"BAIT"; }
void DifficultyDirector::recordHitTaken(){hitsTaken_++; performance_-=8;} void DifficultyDirector::recordDeath(){deaths_++; performance_-=25;} void DifficultyDirector::recordFloorClear(bool p){ if(p){perfectFloors_++; performance_+=18;} else performance_+=6; hitsTaken_=0; }
float DifficultyDirector::scaleForFloor(int f) const{ float s=1+(f-1)*.05f+std::clamp(performance_,-40.f,80.f)/220.f-deaths_*.05f; return std::clamp(s,.75f,1.85f); }
FloorPlan Tower::plan(int f) const{ bool boss=f%5==0, bonfire=(f==10||f==20); EnemyKind k=f<5?EnemyKind::Goblin:f==5?EnemyKind::GoblinKing:f<10?EnemyKind::Orc:f==10?EnemyKind::OrcWarlord:f<15?EnemyKind::Skeleton:f==15?EnemyKind::Lich:f<20?EnemyKind::Wyvern:f==20?EnemyKind::Dragon:f<25?EnemyKind::VoidSpawn:EnemyKind::Archdemon; std::string b=f<5?"Horde":f<10?"Brute":f<15?"Plague":f<20?"Feral":"Void"; return {f,b,boss,bonfire,k,director_.scaleForFloor(f)}; }
std::vector<Enemy> Tower::spawn(int f) const{ auto p=plan(f); int n=p.boss?1:2+f%3; std::vector<Enemy> out; for(int i=0;i<n;i++){ Enemy e{p.primary, (p.boss?180.f:30.f)*p.scale, (p.boss?14.f:6.f)*p.scale,{p.primary}}; if(director_.veteran()&&f==5)e.hp*=2; out.push_back(e);} return out; }
GameSimulation::GameSimulation(CharacterId h,uint32_t seed):rng_(seed),tower_(director_),player_(makeSpec(h)){ enemies_=tower_.spawn(1); }
void GameSimulation::press(Button b){input_.push(b,true,frame_); for(auto&e:enemies_)e.ai.observe(b);} void GameSimulation::release(Button b){input_.push(b,false,frame_);} 
void GameSimulation::tick(){ if(input_.buffered(Button::Light,frame_)) player_.startAttack(player_.spec.light); if(input_.buffered(Button::Heavy,frame_)) player_.startAttack(player_.spec.heavy); if(input_.buffered(Button::Special,frame_)) player_.startAttack(player_.spec.special); player_.tick(input_,frame_); if(auto hb=player_.hitbox()) for(auto&e:enemies_) if(e.hp>0){ e.hp-=player_.current.damage; auto layers=synth_.hitLayers(player_.current.damage>10?"heavy":"light",player_.current.damage); audio_.insert(audio_.end(),layers.begin(),layers.end()); } frame_++; }
}
