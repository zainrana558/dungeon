#pragma once
#include "pixel_fury.hpp"
#include <array>
#include <string>
#include <string_view>
#include <vector>

namespace pf {
struct AnimationBeat {
  std::string name;
  int startup{0};
  int active{0};
  int recovery{0};
  int pixelOvershoot{0};
  float smearOpacity{0.0f};
  std::string silhouetteNote;
};

struct MovementModel {
  CharacterId id;
  float accelerationPixelsPerFrame{0};
  float decelerationPixelsPerFrame{0};
  float airControlRatio{0};
  float waterEaseAmplitude{0};
  int clothLagFrames{0};
  std::string physicsIdentity;
};

struct CharacterBible {
  CharacterId id;
  std::string name;
  std::string codename;
  std::string visualPresence;
  std::string idleBreath;
  std::string walkStyle;
  std::string hiddenAbility;
  MovementModel movement;
  std::vector<AnimationBeat> beats;
};

struct EnemyBible {
  EnemyKind kind;
  std::string name;
  std::string tier;
  std::string driveModel;
  std::string memoryRule;
  std::vector<std::string> tells;
};

struct FloorBible {
  int floor{1};
  std::string biome;
  std::string roomName;
  EnemyKind primary{EnemyKind::Goblin};
  bool boss{false};
  bool bonfire{false};
  float adaptiveAggression{0.5f};
  std::string directorRule;
};

struct AudioPatch {
  std::string id;
  std::string oscillator;
  float baseFrequency{0};
  float attackMs{0};
  float decayMs{0};
  std::string gameplayBinding;
};

class ContentRegistry {
 public:
  static const std::array<CharacterBible, 6>& characters();
  static const std::array<EnemyBible, 10>& enemies();
  static const std::array<FloorBible, 25>& floors();
  static const std::array<AudioPatch, 6>& audioPatches();

  static const CharacterBible& character(CharacterId id);
  static const EnemyBible& enemy(EnemyKind kind);
  static const FloorBible& floor(int floorNumber);
};
}
