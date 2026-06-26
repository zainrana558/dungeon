#pragma once
#include <string>
#include <string_view>
#include <vector>

namespace pf {
struct CharacterActionRecord {
  std::string actionId;
  std::string character;
  std::string category;
  std::string subCategory;
  std::string actionName;
  std::string prompt;
  std::string direction;
  int frameCount{0};
  int startupFrames{-1};
  int activeFrames{-1};
  int recoveryFrames{-1};
  std::string damage;
  std::string specialProperties;
};

struct CharacterMasterRecord {
  std::string characterId;
  std::string characterName;
  std::string codename;
  std::string basePrompt;
  std::string palette;
  std::string spriteSize;
  std::string styleKeywords;
};

class CharacterActionDatabase {
 public:
  static const std::vector<CharacterActionRecord>& actions();
  static const std::vector<CharacterMasterRecord>& characters();
  static std::vector<CharacterActionRecord> byCharacter(std::string_view character);
  static std::vector<CharacterActionRecord> byCategory(std::string_view category);
  static const CharacterActionRecord* find(std::string_view actionId);
  static std::string actionsToGoogleSheetsTsv();
  static std::string charactersToGoogleSheetsTsv();
};
}
