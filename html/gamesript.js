import { Game } from "../UNO/game.js";
import { Carte } from "../UNO/cartes.js";
import {comp} from "../UNO/cpu.js";

//draw the card duh
let curJ = null
let step = 'start'
let oncolorpick = false

function draw_card(id){
    // delete every cards
    const divid = ["player1","player2","player3","middle"]
    for (let p = 0; p < divid.length; p += 1){
        const container = document.getElementById(divid[p]);
        container.replaceChildren();
    }
    let imgpath = ""
    let cart = null
    let jorder = [...gaming.joueur]
    let jeur = null
    for (let j = 0; j < gaming.joueur.length; j += 1){
        if ("joueur"+id == gaming.joueur[j].nom){
            cart = gaming.joueur[j].jeu.cartes
            curJ = gaming.joueur[j]
            break
        } else {
            jeur = jorder.shift()
            jorder.push(jeur)
        }
    }
    //let cart = [new Carte(1,12),new Carte(3,2),new Carte(1,14),new Carte(0,6),new Carte(2,10)]
    for (let i = 0; i < cart.length; i += 1){
        if (cart[i].get_valeur() == "+4" || cart[i].get_valeur() == "joker"){
            imgpath = `../images_cartes/${cart[i].get_valeur()}.png`
        }  else {
            imgpath = `../images_cartes/${cart[i].get_valeur()}_${cart[i].get_couleur()}.png`
        }

        const myButton = document.createElement('button');

        const myImage = document.createElement('img');

        // 2. Set the source and other attributes
        myImage.src = imgpath;
        myImage.alt = imgpath;
        myImage.width = 80; // Optional: set width in pixels
        myImage.id = `${cart[i].get_valeur()}_${cart[i].get_couleur()}_${i}`

        myButton.appendChild(myImage);

        myButton.addEventListener('click', cardclick)
        
        // 3. Append it to a container in your HTML (e.g., a <div> with id="container")
        document.getElementById('player1').appendChild(myButton);
    }
    jorder.shift()
    console.log(jorder[0])
    while (jorder.length > 0){
        if (gaming.joueur.length == 2){
            for (let k = 0; k < jorder[0].jeu.cartes.length; k += 1){
                const myImage = document.createElement('img');
                // 2. Set the source and other attributes
                myImage.src = "../images_cartes/dos.png";
                myImage.alt = "../images_cartes/dos.png";
                myImage.width = 50; // Optional: set width in pixels
        
                // 3. Append it to a container in your HTML (e.g., a <div> with id="container")
                document.getElementById('player3').appendChild(myImage);
            }
        }
        jorder.shift()
    }
    const myButton = document.createElement('button');
    let myImage = document.createElement('img');
    myImage.src = "../images_cartes/tas.png";
    myImage.alt = "../images_cartes/tas.png";
    myImage.width = 80; // Optional: set width in pixels
    myButton.appendChild(myImage);
    myButton.addEventListener('click', pioche);
    document.getElementById('middle').appendChild(myButton);

    myImage = document.createElement('img');
    myImage.src = `../images_cartes/${gaming.tas.devant.get_valeur()}_${gaming.tas.devant.get_couleur()}.png`;
    myImage.alt = `${gaming.tas.devant.get_valeur()}_${gaming.tas.devant.get_couleur()}`;
    myImage.width = 60; // Optional: set width in pixels
    document.getElementById('middle').appendChild(myImage);
}

function pick_color(card){
    const myImag = document.createElement('img');
    myImag.src = `../images_cartes/font.png`;
    myImag.alt = `../images_cartes/font.png`;
    myImag.width = 80; // Optional: set width in pixels
    const colorpicker = ['rouge', 'bleu', 'vert', 'jaune']
    document.getElementById('colorpick').appendChild(myImag);
    for (let i = 0; i < colorpicker.length; i += 1){
        const myButton = document.createElement('button');
        const myImage = document.createElement('img');
        myImage.src = `../images_cartes/${colorpicker[i]}.png`;
        myImage.alt = `../images_cartes/${colorpicker[i]}.png`;
        myImage.width = 80; // Optional: set width in pixels
        myImage.id = colorpicker[i]
        myButton.appendChild(myImage);
        myButton.addEventListener('click', (event) => {
            colorpicked(event, card); // Now you have 3 arguments!
        });
        // 3. Append it to a container in your HTML (e.g., a <div> with id="container")
        document.getElementById('colorpick').appendChild(myButton);
        // 2. Set the source and other attributes
    
    }
}

function colorpicked(event, card){
    curJ.jeu.cartes[card[2]] = new Carte(card[1],card[0])
    gaming.checkpose(curJ, [new Carte(event.target.id,card[0]),card[2]])
    const container = document.getElementById("colorpick");
    container.replaceChildren();
    oncolorpick = false;
    socket.emit('draw_card', lobbyId)
    socket.emit('new_turn', lobbyId)
}

function first_turn(){
    if (gaming.joueur[0].ordi == true){
        comp(gaming)
        socket.emit('draw_card', lobbyId)
        socket.emit('new_turn', lobbyId)
    }   
}

const cardclick = (event) => {
    if (oncolorpick == false){
        if (event.target.id == undefined){
        socket.emit('draw_card', lobbyId)
        } else {
            console.log(event.target.id)
            let card = event.target.id.split("_")
            console.log(card)
            console.log(gaming.joueur)
            if (curJ.pose(new Carte(card[1],card[0]),gaming.tas.devant,gaming,card[2])){
                if (card[0] == "+4" || card[0] == "joker"){
                    oncolorpick = true
                    pick_color(card)
                } else {
                    gaming.checkpose(curJ, [new Carte(card[1],card[0]),card[2]])
                    socket.emit('draw_card', lobbyId)
                    socket.emit('new_turn', lobbyId)
                }
            }
        }
    }
}

const pioche = (event) => {
    if (curJ.tour == true){
        curJ.old_pioche(1,gaming)
    }
    socket.emit('draw_card', lobbyId)
    socket.emit('new_turn', lobbyId)
}

const gaming = new Game()
const socket = io()
let localLobbies = {}; // This will hold the copy of the server data
let lobbyId = null;

socket.emit("gamestarts")

socket.on('play_next', () => {
    gaming.new_turn()
    if (gaming.joueur[0].ordi == true){
        comp(gaming)
        socket.emit('draw_card', lobbyId)
        socket.emit('new_turn', lobbyId)
    }
})

socket.on('init_data', (serverLobbies, lobbyid) => {
    localLobbies = serverLobbies;
    lobbyId = lobbyid
    console.log(localLobbies[lobbyid])
    console.log("I now have the lobby data!", localLobbies);
    let cpu = 0
    if (localLobbies[lobbyId].players.length != localLobbies[lobbyId].maxPlayers){
        cpu = localLobbies[lobbyId].maxPlayers - localLobbies[lobbyId].players.length
    }
    /*let nametab = []
    for (i = 0; i < localLobbies[lobbyId].players.length; i +=1){
        nametab.push("Joueur"+i)
    }
    */
    gaming.createjoueur(cpu, localLobbies[lobbyId].maxPlayers)
    gaming.start()
    socket.emit('draw_card', lobbyId)
    first_turn()
});

socket.on('info_draw', (id) => {
    draw_card(id)
});

