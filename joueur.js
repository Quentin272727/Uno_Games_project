import { Paquet, Carte, Tas } from './cartes.js';
import { getRandomInt } from './cusfunc.js';
export class Joueur{
    constructor(pc,name=null){
        this.jeu = new Paquet() //le jeu de la persoone aka son paquet de cartes
        this.points = 0  //son nombre de points sert si on fait plusieurs parties d'affiller
        this.tour = false // False = n'est pas le tour du joueur, True c'est a son tour de poser une carte
        this.ordi = pc  // Vrai si c'est l'ordi qui le controle, Faux sinon
        this.nom = name // nom du joueur, pour les ordinateur on prendra une liste d'un fichier probablement
        this.uno = false // est utilisé pour detecter si le joueur a pressé le button d'uno pour le UNO ou contre UNO
        this.timing = -1 // est utilisé uniquement par les ordis pour savoir quand le bouton UNO pourra être presser
    }
    str(){
            return `nom ${this.nom}, ${this.points} pts, ${this.tour}, ordi? ${this.ordi}`
    }
    pose(c,t, g, rang){ // type: ignore
        /*l'idee ici est que si un joueur clique sur une carte cela renvoie a cette fonction
        cette methode compare si la carte clique peut etre mis dans le tas 
        si c'est le cas le programe revoie a la ligne checkpose() pour verifie si c'est son tour ou non
        si la carte est incompatible, rien ne se passe
        cette fonction prend comme argument, la carte clique, la carte au dessus du tas, la partie actuel et le rang de la carte clique 
        peut etre utiliser par les cpus aussi
        retourne True si la carte peut être posé*/
        let check = false
        if (c.get_valeur() == '+4' || c.get_valeur() == 'joker'){
            check = true
        } else if (c.get_couleur() == t.get_couleur()){
            check = true
        } else if (c.get_valeur() == t.get_valeur()){
            check = true
        }
        if (check == true){
            //g.checkpose(self,c,rang)
            return true
        }
        return null
    }
    pioche(n,g){ //comme la fonction pose, si on clique sur la pioche, cela revoira a cette fonction
        //Si cette fonction est appele, ajoute une n cartes au joueur
        if (this.tour == true){
            this.jeu.ajoutercartes(n,g)
        }
    }
        
    addpoint(n){
        //ajoute n points au joueurs, aussi simple que ca
        this.points += n
    }
    
    AI(game){
        /*La bete, le cpu du jeu
        le cpu fonctionne de tel sorte:
        D'abord il y a un tri de cartes, les cartes normales (0-9,+2,inverse,block) et les cartes speciales (joker,+4)
        availible et special sont des tableaux de tableaux comme etant [[Classe Carte, rang de la carte dans le paquet]]
        availible: ce sont les cartes normales et qui peuvent etre joue
        special: +4 et joker elles peuvent etre tout le temps jouedonc pas de check 
        availible a la priorite,si il y a des cartes normales qui pevent etre joue, le cpu choisira au hazard une carte dans avalible a poser
        Si il n'y a rien dans availible une carte speciale sera pose, toujours au hazard
        enfin si il n'y a ni carte possible a jouer ni carte speciale, le cpu pioche
        reourne la carte et son rang, retourne None et None si l'ordi doit piocher*/
        let copycard = [...this.jeu.cartes]
        let special = []
        let availible = []
        for (let i = 0; i < copycard.length; i += 1){
            if (copycard[i].get_valeur() == "joker" || copycard[i].get_valeur() == "+4"){
                special.push([copycard[i],i])
            } else if (copycard[i].get_valeur() == game.tas.devant.get_valeur() || copycard[i].get_couleur() == game.tas.devant.get_couleur()){
                availible.push([copycard[i],i])
            }
        }
        //print("carte du joueur", self.jeu)
        if (availible.length != 0){
            let j = getRandomInt(availible.length)
            console.log("carte du tas", game.tas.devant.str(),"carte qui va etre pose",availible[j][0].str())
            //this.pose(availible[j][0],game.tas.devant,game,availible[j][1])
            return [availible[j][0], availible[j][1]]
        }

        if (special.length != 0){
            let k = getRandomInt(special.length)
            console.log("carte du tas", game.tas.devant.str(),"carte qui va etre pose",special[k][0].str())
            //this.pose(special[k][0],game.tas.devant,game,special[k][1]) 
            return [special[k][0] , special[k][1]]
        }
        else {
            this.pioche(1,game)
            console.log("pioche")
            return null
        }
    }
}