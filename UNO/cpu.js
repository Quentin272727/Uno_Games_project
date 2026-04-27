export function comp(game){
        /*L'ordinateur, d'abord il regarde si il peut poser une carte ou non, si il ne peut pas il pioche
        Si le paquet de l'ordi est vide alors il gagne
        ensuite fait les diverse actions des cartes
        puis recharge les cartes des ordinateurs et du joueurs humain, puis lance un nouveau tour*/
        let t = game.joueur[0].AI(game)
        game.checkpose(game.joueur[0],t)
}