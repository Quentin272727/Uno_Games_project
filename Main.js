import './server/public/Server.js'   

import { Game } from './game.js'
import { comp } from './cpu.js'

const gaming = new Game()

gaming.createjoueur(4)
gaming.start()

while (gaming.victory == false){
    comp(gaming)
}
