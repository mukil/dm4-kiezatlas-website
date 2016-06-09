package de.kiezatlas.website;

import de.deepamehta.core.Topic;

import java.util.List;



public interface WebsiteService {

    static final String THEMA_CRIT = "ka2.criteria.thema";
    static final String ANGEBOT_CRIT = "ka2.criteria.angebot";
    static final String ZIELGRUPPE_CRIT = "ka2.criteria.zielgruppe";
    static final String TRAEGER_CRIT = "ka2.criteria.traeger";

    static final String TRAEGER_FACET = "ka2.traeger.facet";
    static final String TRAEGER = "ka2.traeger";
    static final String TRAEGER_NAME = "ka2.traeger.name";
    static final String TRAEGER_ART = "ka2.traeger.art";

    static final String OEFFNUNGSZEITEN_FACET = "ka2.oeffnungszeiten.facet";
    static final String OEFFNUNGSZEITEN = "ka2.oeffnungszeiten";

    static final String KONTAKT_FACET = "ka2.kontakt.facet";
    static final String KONTAKT = "ka2.kontakt";
    static final String KONTAKT_MAIL = "ka2.kontakt.email";
    static final String KONTAKT_ANSPRECHPARTNER = "ka2.kontakt.ansprechpartner";
    static final String KONTAKT_FAX = "ka2.kontakt.fax";
    static final String KONTAKT_TEL = "ka2.kontakt.telefon";

    static final String BESCHREIBUNG_FACET = "ka2.beschreibung.facet";
    static final String BESCHREIBUNG = "ka2.beschreibung";

    static final String SONSTIGES_FACET = "ka2.sonstiges.facet";
    static final String SONSTIGES = "ka2.sonstiges";

    static final String STICHWORTE_FACET = "ka2.stichworte.facet";
    static final String STICHWORTE = "ka2.stichworte";

    static final String BEZIRK_FACET = "ka2.bezirk.facet";
    static final String BEZIRK = "ka2.bezirk";

    static final String BEZIRKSREGION_FACET = "ka2.bezirksregion.facet";
    static final String BEZIRKSREGION = "ka2.bezirksregion";

    static final String LOR_FACET = "ka2.lor_nummer.facet";
    static final String LOR = "ka2.lor_nummer";

    static final String WEBSITE_FACET = "ka2.website.facet";
    static final String IMAGE_FACET = "ka2.bild.facet";

    // static final String CONFIRMED_TYPE = "ka2.website.confirmed";
    static final String CONFIRMATION_WS_URI = "de.kiezatlas.ws_confirmation";
    static final String CONFIRMATION_WS_NAME = "Confirmation";

    static final String POSTAL_CODE_DUMMY_VALUE = "0";

    /**
     * Searching in four child topic types of geo object, returning topics of type "ka2.geo_object".
     */
    List<Topic> searchFulltextInGeoObjectChilds(String searchTerm);

}
