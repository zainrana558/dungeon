#pragma once
#include <string>
#include <string_view>
#include <vector>

namespace pf {
struct MonsterActionRecord {
  std::string actionId;
  std::string monster;
  std::string tier;
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

class MonsterActionDatabase {
 public:
  static const std::vector<MonsterActionRecord>& actions();
  static std::vector<MonsterActionRecord> byMonster(std::string_view monster);
  static std::vector<MonsterActionRecord> byCategory(std::string_view category);
  static const MonsterActionRecord* find(std::string_view actionId);
  static std::string toGoogleSheetsTsv();
};
}
