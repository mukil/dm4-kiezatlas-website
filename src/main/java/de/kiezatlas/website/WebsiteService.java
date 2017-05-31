package de.kiezatlas.website;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;

import java.util.List;



public interface WebsiteService {

    static final String USER_ASSIGNMENT = "de.kiezatlas.user_assignment";
    static final String BILD_ASSIGNMENT = "de.kiezatlas.bild_assignment";

    static final String CONFIRMATION_WS_URI = "de.kiezatlas.ws_confirmation";
    static final String CONFIRMATION_WS_NAME = "Confirmation";

    // New as of Migration13: LOR - Bezirksregion - Bezirk Utility Topic Types
    static final String BEZIRK_NAME = "ka2.util.bezirk_name";
    static final String BEZIRKSREGION_NAME_FACET = "ka2.util.bezirksregion_name_facet";
    static final String BEZIRKSREGION_NAME = "ka2.util.bezirksregion_name";
    static final String LOR_UTIL = "ka2.util.lor";
    static final String LOR_UTIL_ID = "ka2.util.lor_id";

    static final String WEBSITE_FACET = "ka2.website.facet";

    static final String POSTAL_CODE_DUMMY_VALUE = "0";

    // The URIs of KA2 Geo Object topics synchronized (and kept up-to-date in) Kiezatlas 1 have this prefix.
    // The remaining part of the URI is the original KA1 topic id.
    static final String KA1_GEO_OBJECT_URI_PREFIX = "de.kiezatlas.topic.";
    static final String BEZIRKSREGION_SHAPEFILE_NAME_PREFIX = "Flaeche ";

    /**
     * Searching in four child topic types of geo object, returning topics of type "ka2.geo_object".
     * @param searchTerm    User given phrase with one or many search term/s
     * @param doSplitWildcards  flag to append a wildcard to each search term
     * @param appendWildcard    flag to append a wildcard to the given phrase
     * @param doExact   flag to encode the search phrase in quotations
     * @param leadingWildcard    prefix a wildcard to the given phrase
     * @return 
     */
    List<Topic> searchFulltextInGeoObjectChilds(String searchTerm, boolean doSplitWildcards,
            boolean appendWildcard, boolean doExact, boolean leadingWildcard);

    /**
     * 
     * @param topicId An ID of a Kiezatlas 1 (id starts with "t-") oder Kiezatlas 2 (id is a long) topic.
     * @return 
     */
    Topic getGeoObjectById(String topicId);

    /**
     * 
     * @param topicId   An ID of a Kiezatlas 1 (id starts with "t-") oder Kiezatlas 2 (id is a long) topic.
     * @param siteId    An ID of a Kiezatlas Website Topic with facets.
     * @return 
     */
    Topic getFacettedGeoObjectTopic(String topicId, long siteId);

    List<RelatedTopic> getAllCategories(Topic geoObject);

    Topic getStandardWorkspace();

    Topic getConfirmationWorkspace();

}
