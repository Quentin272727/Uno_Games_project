export function comp(game){
        /*L'ordinateur, d'abord il regarde si il peut poser une carte ou non, si il ne peut pas il pioche
        Si le paquet de l'ordi est vide alors il gagne
        ensuite fait les diverse actions des cartes
        puis recharge les cartes des ordinateurs et du joueurs humain, puis lance un nouveau tour*/
        let t = game.joueur[0].AI(game)
        game.checkpose(game.joueur[0],t)
        if (game.joueur[0].jeu.cartes.length == 0){
            game.victoire(game.joueur[0])
        } else {
            if (t == null){}
            else if (game.tas.devant.get_valeur() == "+4" || game.tas.devant.get_valeur() == "+2" || game.tas.devant.get_valeur() == "block"){
                let temp = game.joueur[0] //skip le tour du joueur suivant
                game.joueur.splice(0,1)
                game.joueur.push(temp)
            } else if (game.tas.devant.get_valeur() == "inverse"){
            }
            //Met la nouvelle carte sur le paquet
            //ctas = ttk.Label(fenetre,image=carte[cherchecarte(game.tas.devant.get_valeur(),game.tas.devant.get_couleur(),True)])
            //ctas.place(x=360,y=210)
            //recharge les cartes
            //reloadcpucard()
            //reloadcard(f)
            //nouveau tour
            game.new_turn()
            //regarde si c'est à nouveau le tour d'un ordinateur
            if (game.joueur[0].ordi == true){
                comp(game)
            }
        }
}