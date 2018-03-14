/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function init() {
    $('.ui.checkbox').checkbox()
    console.log("initialized all checkboxes on the page...")
    $('.ui.dropdown').dropdown()
    console.log("initialized all dropdown elements on the page...")

}

function toggleSearchCriteria() {
    console.log("toogle search criteria div...")
}

function loadMap() {
    var map = L.map('map').setView([52.484948, 13.344442], 13)
        /**L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map) **/
        L.tileLayer('https://api.tiles.mapbox.com/v4/kiezatlas.pd8lkp64/{z}/{x}/{y}.png?' // old style id="kiezatlas.map-feifsq6f"
            + 'access_token=pk.eyJ1Ijoia2llemF0bGFzIiwiYSI6ImNpa3BndjU2ODAwYm53MGxzM3JtOXFmb2IifQ._PcBhOcfLYDD8RP3BS0U_g', {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors,'
            + '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &#169; <a href="http://mapbox.com">Mapbox</a>',
            id: 'kiezatlas.m7222ia5'}).addTo(map)
}
