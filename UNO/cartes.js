import { getRandomInt, assert } from './cusfunc.js';
export class Carte{
    constructor(c, v){
        /*Initialise les attributs couleur (entre 0 et 3), et
        valeur (entre 0 et 14).
        j'ai ajouter un converteur en string donc si on tape 'rouge', cela devrai le convertir en int et donc marcher
        */
       console.log(c + "val" + v)
        if (typeof c == "string"){
            let converted = false
            let i = 0
            let color = ['rouge', 'vert', 'jaune', 'bleu']
            while (converted == false && i < color.length){
                if (c == color[i]){
                    c = i
                    converted = true
                }
                i += 1
            }
            assert(converted == true, "Erreur de convertion string couleur")
        }
        if(typeof v == "string"){
            let converted = false
            let i = 0
            let values = ['0','1','2','3','4','5','6','7','8','9','block','inverse','+2','+4','joker']
            while (converted == false && i < values.length){
                if (v == values[i]){
                    v = i
                    converted = true
                }
                i += 1
            }
            assert(converted == true, "Erreur de convertion string valeur")
        }
        this.couleur = c 
        this.valeur = v
    }
    str(){
        return `${this.get_valeur()} ${this.get_couleur()} ->`
    }
    get_valeur(){
        // fonction qui retourne la valeur en string de la carte
        let valeurs = ['0','1','2','3','4','5','6','7','8','9','block','inverse','+2','+4','joker']
        return valeurs[this.valeur] 
    }
    get_couleur(){
        // Fonction qui retourne la couleur en string de la carte
        let couleurs = ['rouge', 'vert', 'jaune', 'bleu'] 
        return couleurs[this.couleur]
    }
}
export class Paquet{
    constructor(){
        this.cartes = []
        this.points = 0
        this.tour = false
    }
    
    str(){
        let f = ``
        for (let i = 0; i < this.cartes.length; i += 1){
            f += this.cartes[i].str()
        }
        return f
    } 
    start(game){
        //Met 7 cartes dans le paquet, a utiliser au commencement d'une partie
        this.ajoutercartes(7,game)
    }
    retirercarte(rang){
        /*retire une carte
        prend comme argument le rang de la carte*/
        this.cartes.splice(rang,1)
    }

    ajoutercartes(nb,game){
        /*ajoute n carte(s) au paquet
        prend comme argument nb qui est le nombre de carte(s) a ajouter*/
        for (let i = 0; i < nb; i += 1){
            if (game.carte_dispo.cartes.length == 0){
                game.carte_dispo.start_cartes_de_jeu()
            }
            this.cartes.push(game.carte_dispo.cartes[0])
            game.carte_dispo.cartes.splice(0,1)
        }
    }
    ajoutercustom(c){
        /*Ajoute la carte que l'on veut au paquet
        n'ai pas a utiliser, il n'est la que pour testerou pour une fin secrete cof cof
        prend comme argument la carte quel'on veut*/
        this.cartes.push(c)
    }
    findepartie(){
        //Vide le paquet du joueur"""
        //code comptage de pts
        this.cartes = []
    }
    start_cartes_de_jeu(){
        /*Mets les 108 cartes du jeu de uno, les cartes sont d'abord mis dans l'ordre et il sont ensuite dispatcher aleatoirement
        toutes les cartes du jeu sont dans ce tas. ceci est un paquet de carte a mettre dans une variable*/
        this.cartes = []
        let val = 0
        let nbr = 1
        while (val < 15){ //mettage de cartes dans le paquet/elle sont tri car dans c'est mis dans l'ordre
            let coul = 0
            while (coul < 4){
                if (val > 0 && val < 13){
                    nbr = 2
                } else if(val == 13 || val == 14){
                    nbr = 1
                }
                this.cartes.push([new Carte(coul,val),nbr])
                coul += 1
            }
            val += 1
        }
        let cnbr = 0
        for (let o = 0; o < this.cartes.length; o += 1){ //compte le nombre de cartes totale pour la boucle qui suit
            cnbr += this.cartes[o][1]
        }
        let randcartes = []
        for (let p = 0; p < cnbr; p += 1){ //Melange du paquet
            let r = getRandomInt(this.cartes.length)
            randcartes.push(this.cartes[r][0])
            this.cartes[r][1] -= 1
            if (this.cartes[r][1] <= 0){
                this.cartes.splice(r,1)
            }
        }
        this.cartes = randcartes
    }
}
export class Tas{
    constructor(){
        //Le tas du jeu, ou tout se joue
        this.devant = null
        this.endessous = null // c'est la carte apres l'actuel, ceci est utilise pour que les cpu ne mettent pas la couleur qu'iln'ont pas sur un joker ou +4
    }
    start(game){
        /*met une carte aleatoire sur le tas
        prend comme argument la partie actuelle*/
        game.carte_dispo.cartes[0].str()
        this.devant = game.carte_dispo.cartes[0]
        game.carte_dispo.cartes.splice(0,1)
    }
    new_card(neww){
        /*met une nouvelle carte sur le tas et sauvegarde l'ancienne carte derriere la premiere carte
        prend comme argument une carte*/
        this.endessous = this.devant
        this.devant = neww
    }
    reset(){
        //A utiliser a la fin de partie, vide le tas
        this.devant = null
        this.endessous = null
    }
}