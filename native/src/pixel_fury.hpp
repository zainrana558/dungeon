#pragma once
#include <array>
#include <cstdint>
#include <deque>
#include <map>
#include <optional>
#include <random>
#include <string>
#include <vector>

namespace pf {
constexpr int kFps = 60;
constexpr int kInputBufferFrames = 10;
constexpr int kCoyoteFrames = 6;

struct Vec2 { float x{0}, y{0}; };
struct Rect { float x{0}, y{0}, w{0}, h{0}; bool overlaps(const Rect& r) const; };

enum class Button { Left, Right, Up, Down, Light, Heavy, Special, Grab, Block };
enum class Phase { Idle, Startup, Active, Recovery, Hitstun, Dead };
enum class CharacterId { Knight, Assassin, Mage, Necromancer, Paladin, Warrior };
enum class EnemyKind { Goblin, GoblinKing, Orc, OrcWarlord, Skeleton, Lich, Wyvern, Dragon, VoidSpawn, Archdemon };

struct AttackDef {
  std::string name;
  int startup{5}, active{3}, recovery{8}, damage{8};
  float range{38}, radius{18}, knockback{3};
  bool projectile{false}, guardCrush{false}, freeze{false}, summon{false}, reflect{false};
};

struct InputEvent { Button button; bool pressed; int frame; };
class InputBuffer {
 public:
  void push(Button button, bool pressed, int frame);
  bool buffered(Button button, int now, int frames = kInputBufferFrames) const;
  bool released(Button button, int now, int frames = kInputBufferFrames) const;
  int pressesInWindow(int now, int frames) const;
 private:
  std::deque<InputEvent> events_;
};

struct ClothPoint { Vec2 pos, prev; bool pinned{false}; };
struct ClothStick { int a{0}, b{0}; float length{0}; };
class VerletCloth {
 public:
  void makeCape(Vec2 anchor, int width, int height, float spacing);
  void simulate(Vec2 anchor, float wind, int iterations = 4);
  const std::vector<ClothPoint>& points() const { return points_; }
 private:
  std::vector<ClothPoint> points_;
  std::vector<ClothStick> sticks_;
  int rowWidth_{0};
};

struct SynthEvent { std::string layer; float frequency; float seconds; float gain; };
class SynthAudio {
 public:
  std::vector<SynthEvent> hitLayers(const std::string& weight, int damage) const;
  SynthEvent timerClick(int secondsLeft) const;
};

struct FighterSpec {
  CharacterId id; std::string name, codename;
  float maxHp{100}, walkSpeed{3}, airControl{0.6f};
  int accelFrames{8}, decelFrames{8};
  AttackDef light, heavy, special, dash;
};

FighterSpec makeSpec(CharacterId id);

struct Fighter {
  FighterSpec spec;
  Vec2 pos{100, 0}, vel{};
  float hp{100};
  bool grounded{true}, facingRight{true}, hiddenActive{false};
  int hiddenTimer{0}, phaseFrame{0}, spellCasts{0}, backStabs{0};
  Phase phase{Phase::Idle};
  AttackDef current{};
  VerletCloth cloth;
  explicit Fighter(FighterSpec s);
  void startAttack(const AttackDef& atk);
  void tick(const InputBuffer& input, int frame);
  Rect hurtbox() const;
  std::optional<Rect> hitbox() const;
  void takeDamage(int amount, bool counterHit);
 private:
  void updateHidden();
};

struct Drives { float aggression{0.5f}, fear{0.2f}, greed{0.2f}, patience{0.5f}, frustration{0}; };
struct EnemyAI {
  EnemyKind kind{EnemyKind::Goblin}; Drives drives{}; std::deque<Button> playerHistory; int searchFrames{0};
  std::string decide(int floor, const Fighter& player, int frame);
  void observe(Button b);
};

struct Enemy { EnemyKind kind; float hp, damage; EnemyAI ai; };
class DifficultyDirector {
 public:
  void recordHitTaken(); void recordDeath(); void recordFloorClear(bool perfect);
  float scaleForFloor(int floor) const; bool veteran() const { return perfectFloors_ >= 4; }
 private:
  int hitsTaken_{0}, deaths_{0}, perfectFloors_{0}; float performance_{0};
};

struct FloorPlan { int floor; std::string biome; bool boss; bool bonfire; EnemyKind primary; float scale; };
class Tower {
 public:
  explicit Tower(DifficultyDirector& d) : director_(d) {}
  FloorPlan plan(int floor) const;
  std::vector<Enemy> spawn(int floor) const;
 private: DifficultyDirector& director_;
};

class GameSimulation {
 public:
  GameSimulation(CharacterId hero, uint32_t seed = 7);
  void press(Button b); void release(Button b); void tick();
  Fighter& player() { return player_; } const std::vector<Enemy>& enemies() const { return enemies_; }
  int frame() const { return frame_; } const std::vector<SynthEvent>& audio() const { return audio_; }
 private:
  int frame_{0}, floor_{1}; std::mt19937 rng_; InputBuffer input_; DifficultyDirector director_; Tower tower_; Fighter player_; std::vector<Enemy> enemies_; SynthAudio synth_; std::vector<SynthEvent> audio_;
};
}
