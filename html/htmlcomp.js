import { Carte, Paquet } from "/UNO/cartes.js";
function test(){ //argument le joueur qui a l'écran peut être
    let imgpath = ""
    let cart = [new Carte(1,12),new Carte(3,2),new Carte(1,14),new Carte(0,6),new Carte(2,10)]
    for (let i = 0; i < cart.length; i += 1){
                if (cart[i].get_valeur() == "+4" || cart[i].get_valeur() == "joker"){
                    imgpath = `../images_cartes/${cart[i].get_valeur()}.png`
                }  else {
                    imgpath = `../images_cartes/${cart[i].get_valeur()}_${cart[i].get_couleur()}.png`
                }
        const myImage = document.createElement('img');

        // 2. Set the source and other attributes
        myImage.src = imgpath;
        myImage.alt = imgpath;
        myImage.width = 100; // Optional: set width in pixels

        // 3. Append it to a container in your HTML (e.g., a <div> with id="container")
        document.getElementById('container').appendChild(myImage);
    }
}
test()