import { Paquet, Carte, Tas } from './cartes.js';
import { Joueur } from './joueur.js';
import{ getRandomInt } from './cusfunc.js';
export class Game{
    constructor(){
        /*etape: dit a quelle etape est le jeu, concretement ne sert a rien
        joueur: la liste de joueur dans le jeu, attention! il definit aussi les tours des joueurs
        tas: le tas du jeu, auto explcatif mdr
        nbrtour: nombre de tour passe, juste une donne statistique
        victory: sert uniquement pour detecter si il y a une vainqueur pour stopperla boucle avec new_turn
        gagnant: joueur qui a gagne la partie
        carte_dispo: C'est la pioche ou toutes les cartes selon les tas habituelle de uno sont, toutes les cartes sont pris d'ici*/
        this.etape = ''
        this.joueur = []
        this.tas = new Tas()
        this.nbrtour = 0
        this.victory = false
        this.gagnant = null
        this.carte_dispo = new Paquet()
    }
    ordredej(){
        /*definit l'ordre des joueurs aleatoirement
        retourne un tableau de joueur
        j2 est une copie du tableau de joueur puis la boucle choisis un rang aleatoire puis prend le joueur avec le rang selectionne,
        sachant que le rang 0 = le premier a jouer*/
        let j2 = [...this.joueur]
        let ordre = []
        while (j2.length != 0){
            let rand = getRandomInt(j2.length)
            ordre.push(j2[rand])
            j2.splice(rand,1)
        }
        return ordre
    }
    createjoueur(cpuCount, totalPlayers){
        /*cree un tableau de totalPlayers joueurs.
        Les (totalPlayers - cpuCount) premiers joueurs sont humains, les suivants sont des CPUs.*/
        const humanCount = totalPlayers - cpuCount;
        for (let i = 0; i < totalPlayers; i += 1){
            const isOrdi = i >= humanCount; // humans first, then CPUs
            this.joueur.push(new Joueur(isOrdi, `joueur${i+1}`))
        }
    }
    AI_select_color(prems){
        /*Fonction pour les cpus, permet de selectionne une couleur aleatoirement 
        en excluant la couleur qui etait sur le tas donc celle qui n'avait pas
        (car les cpus jouent les cartes couleurs en priorite)*/
        let newcolorlist = ['rouge', 'vert', 'jaune', 'bleu']
        let newcolor = 0
        if (prems == false){
            let ejected = null
            let x = 0
            while (ejected == null){
                if (newcolorlist[x] == this.tas.endessous.get_couleur()){
                    ejected = newcolorlist[x]
                }
                x +=1
            }
            newcolorlist.splice(ejected,1)
            newcolor = getRandomInt(2)
            return newcolorlist[newcolor]
        }
        else {
            newcolor = getRandomInt(3)
            return newcolorlist[newcolor]
        }
    }
    start(){
        /*A utiliser des que la partie commence et que les joueurs soit selectionne avant.
        la fonction cree le paquet de carte puis pose la premiere carte du tas
        ensuite definis l'ordre de jeu
        ensuite fait l'action de la premiere carte sur lepremier joueur 
        et met la condition true au joueur au quelle cela va etre le tour*/
        this.etape = 'debut'
        this.carte_dispo.start_cartes_de_jeu()
        console.log("1")
        this.tas.start(this)
        console.log("2")
        for (let i = 0; i < this.joueur.length; i += 1){
            this.joueur[i].jeu.start(this)
        }
        console.log("3")
        this.joueur = this.ordredej()
        console.log("4")
        this.etape = "attente d'action"
        this.checkcarteaction(this.tas.devant,true)
        console.log("5")
        this.joueur[0].tour = true
    }
    IAstart(){
        this.checkcarteaction(this.tas.devant,true)
        this.joueur[0].tour = true
        if (this.joueur[0].ordi == true){
            this.joueur[0].AI()
        }
    }
    reset(){
        /*Reset la partie, vide le tas, remet le nombre de tour,le gagnant,et la victoire a 0 
        Attention, les statistiques des joueurs sont conserve, aka nbr de pts, le nom, les joueurs dans la partie
        a utiliser donc pour rejouer*/
        this.etape = 'reset'
        this.nbrtour = 0
        this.victory = false
        this.tas.reset()
        this.gagnant = null
    }
    checkpose(player,c){ //si un joueur click sur une carte cela renvoie le nom du joueur et si sa carte pose est valide, si valide il le posera dans le tas, sinon rien ne se passe
        /*Fonction qui controle si c'est bien a ce jouer si il clique une carte valide
        Si oui,le tour du joueur est directement mis a false (comme caonne peut pas clique plusieurs cartes)
        elle retire ensuite la carte du joueur et le met dans le tas
        la fonction va d'abord regarder si le joueur gagne apres avoir deposer sa carte (j'aurais peut etre du attendre de faire l'action d'abordcomme ca en cas de +2 et +4 ongagne + de pts)
        si le joueur ne gagne pas, le jeu va voir si sa carte fais une action
        Prend 3 argument, le joueur qui a clique ou l'ordi qui joue la carte, puis la carte selectionne et son rang*/
        if (player.tour == true)
            if (c == null){
                return null
            }
            this.etape = 'le joueur a joue'
            this.tas.new_card(c[0])
            player.jeu.retirercarte(c[1])
            this.last_card(player)
            if (player.jeu.cartes.length == 0){
                this.gagnant = player
                return null
            }
            else {
                this.action(c[0])
            }
    }
    action(c=null){
        /*Il y a deux moyen d'arriver ici, soit en piochant dans quelle cas cette fonctionfera rien et passera au prochain tour (avec la boucle while dans l'execution)
        soit que le joueur a pose sa carte et que c'est son tour, dans ce cas la fonction renvoie a une autre fonction pour faire l'action de la carte
        Prend comme argument une carte auquel l'action va etre executer, si aucune carte n'est donne (par la pioche) rien ne se passe"""
        #apres que le joueur aient jouer ca carte, cette fonction regardera si la carte pose doit faire une action(pour les carte specialcomme +4) puis change de tour
        # si aucune carte n'est donne (pioche) le tour passe au joueur suivant directement*/
        if (c !=null){
            this.checkcarteaction(c)
        }
    }
    checkcarteaction(c,premier = false){
        /*Compare la valeur de la carte avec les valeurs qui omt une influence sur le jeu
        donc pour les valeurs de 0 a 9 rien ne se passe
        pour le +4 le joueur prochain joueur pioche 4 cartes (ou le premier joueur si c'est la premiere carte du tas) puis selectionne le cpu/joueur selectionne la couleur qu'il veut puis fais sauter le tour du joueur qui a pioche
        Joker le cpu/joueur selectionne sa couleur
        +2 meme chose que pour le +4 sauf que c'est 2 cartes et que le joueur n'a pas de couleur a selectionne
        block: met le premier joueur au fond du tableau ensuite il y a le new_turn qui passera au joueur suivant qui passera donc le tour du joueur qui etait sense etrele suivant, cependant cela n'est pas fait ici
        Inverse: compare d'abord si le nombre de joueur et paire ou pas car la fonction ne marche que pour le pair/impair puis prend le 2eme joueur et echange sa place avec le dernier puis meme chose avec l'avant dernier et le 3e
        le premier joueur ne bouge pas donc*/
        let selectedcolor = null
        if (c.get_valeur() == "+4"){
            if (premier == false){
                this.joueur[1].jeu.ajoutercartes(4,this)
            } else {
                this.joueur[0].jeu.ajoutercartes(4,this)
            } if (this.joueur[0].ordi == true || premier == true){
                selectedcolor = this.AI_select_color(premier)
                this.tas.new_card(new Carte(selectedcolor,c.valeur))
            }
        }
        else if (c.get_valeur() == "joker"){
            if (this.joueur[0].ordi == true || premier == true){
                selectedcolor = this.AI_select_color(premier)
                this.tas.new_card(new Carte(selectedcolor,c.valeur)) //Pareil que le +4
            }
        }
        else if (c.get_valeur() == "+2"){
            if (premier == false){
                this.joueur[1].jeu.ajoutercartes(2,this)
            } else {
                this.joueur[0].jeu.ajoutercartes(2,this)
            }
        }
        else if (c.get_valeur() == "inverse"){
            let temp = null
            if (this.joueur.length%2 == 0){
                for (let i = 1; i < parseInt(this.joueur.length/2); i += 1){
                    temp = this.joueur[this.joueur.length-i]
                    this.joueur[this.joueur.length-i] = this.joueur[i]
                    this.joueur[i] = temp
                }
            } else {
                for (let i = 1; i < parseInt(this.joueur.length/2+1); i += 1){
                    temp = this.joueur[this.joueur.length-i]
                    this.joueur[this.joueur.length-i] = this.joueur[i]
                    this.joueur[i] = temp
                }
            }
        }
        if (c.get_valeur() == "block" || c.get_valeur() == "+4" || c.get_valeur() == "+2"){
            this.joueur[0].tour = false
            let temp = this.joueur[0] //skip le tour du joueur suivant
            this.joueur.splice(0,1)
            this.joueur.push(temp)
        }
    }
    calculscore(){
        /*retourne le nombre de points sachant que
        - Les cartes de 0 a 9 valent leurs points numerique
        - les carte speciale (+2,block,inverse) valent 20 points
        - les jokers (+4,joker de couleur) valent 50 points
        de plus cette fonction retire les cartes de tous les joueurs*/
        let score = 0
        for (let i = 1; i < this.joueur.length; i += 1){
            while (this.joueur[i].jeu.cartes.length != 0){
                score += this.scorecarte(this.joueur[i].jeu.cartes[0])
                this.joueur[i].jeu.cartes.splice(0,1)
            }
        }
        return score
    }
    scorecarte(c){
        /*Retourne le score d'une seule carte (int), les valeurs des cartes sont donnees dans le dogstring calculscore()
        prend comme argument la classe carte*/
        if (c.get_valeur() == "1" || c.get_valeur() == "2" || c.get_valeur() == "3" || c.get_valeur() == "4" || c.get_valeur() == "5" || c.get_valeur() == "6" || c.get_valeur() == "7" || c.get_valeur() == "8" || c.get_valeur() == "9"){
            return parseInt(c.get_valeur())
        } else if (c.get_valeur() == "+2" || c.get_valeur() == "block" || c.get_valeur() == "inverse"){
            return 20
        } else if (c.get_valeur() == "+4" || c.get_valeur() == "joker"){
            return 50
        }
        else{
            return 0
        }
    }

    victoire(joueur){
        /*En cas de victoire, met que le jeu a trouver un gagnant et calcule sont score
        prend comme argument le joueur gagnant
        calcul de points, menu de victoire, retirer les cartes
        print('yey')*/
        joueur.addpoint(this.calculscore(joueur))
        this.victory = true
        this.gagnant = joueur.nom
        console.log("le gagant est: " + joueur.nom + " pts: " + joueur.points)
        //self.tas.reset()
    }
    last_card(joueur){ //appelé quand un joueur n'as plus qu'un seule carte
        if (joueur.jeu.cartes.length == 1){
            let result = this.minigame(joueur)
            if (result.nom != joueur.nom){
                console.log("Uno lost")
                joueur.jeu.ajoutercartes(2,this)
            } else {
                console.log("Uno win")
            }
            for (let i = 0; i < this.joueur.length; i += 1){
                this.joueur[i].uno = false
                this.joueur[i].pressed = -1
            }
        }
    }

    minigame(joueur){
        // afficher le button UNO! du joueur qui vient d'être en uno
        let start = Date.now()
        let press = false
        for (let j = 0; j < this.joueur.length; j += 1){
            if (joueur.nom == this.joueur[j].nom && this.joueur[j].ordi == true){
                joueur.timing = 150 + getRandomInt(1000)
            }
            else if (this.joueur[j].ordi == true){
                this.joueur[j].timing = 300 + getRandomInt(1000)
            }
        }
        while (press == false){
            if (Date.now() - start == 200){
                //afficher les buttons pour les autres joueurs
            }
            for (let i = 0; i < this.joueur.length; i += 1){
                if (this.joueur[i].ordi == true){
                    if (this.joueur[i].timing <= Date.now() - start){
                        this.joueur[i].uno = true
                    }
                }
                // pour detecter le click d'un joueur cela sera à une fonction extérieur de le faire
                if (this.joueur[i].uno == true){ //ceci détecte si quelqu'un à pressé le bouton et le retourne
                    press = true
                    console.log(Date.now() - start +"   "+ this.joueur[i].nom)
                    return this.joueur[i]
                }
            }

        }
    }

    new_turn(){
        //Change l'ordre de passage, et met true au tour du joueur qui doit jouer
        this.joueur[0].tour = false
        let temp = this.joueur[0]
        this.joueur.splice(0,1)
        this.joueur.push(temp)
        this.joueur[0].tour = true
        this.nbrtour += 1
        console.log('fin de tour', this.joueur[this.joueur.length-1].jeu.str(), "nbr tour:", this.nbrtour,"tour de", this.joueur[0].nom)
    }
}