#include "pixel_fury.hpp"
#include <iostream>
int main(){ pf::GameSimulation game(pf::CharacterId::Knight); game.press(pf::Button::Special); for(int i=0;i<60;i++) game.tick(); std::cout << "PIXEL FURY native simulation frame=" << game.frame() << " hp=" << game.player().hp << " enemies=" << game.enemies().size() << " audioEvents=" << game.audio().size() << "\n"; }
