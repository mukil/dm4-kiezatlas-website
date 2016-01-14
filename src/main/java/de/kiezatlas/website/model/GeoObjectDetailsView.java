package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.ResultList;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.GeomapsService;
import java.util.logging.Level;
import java.lang.RuntimeException;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 * A data-transfer object wrapping a <code>Geo Object</code>.<br/>
 * Used to display details about a place.

 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 * */
public class GeoObjectDetailsView implements JSONEnabled {

    GeoObjectView geoObjectView = null;
    long geoCoordinateTopicId = -1;
    //
    ResultList<RelatedTopic> relatedTopics = null;
    ResultList<RelatedTopic> relatedAudiences = null;
    ResultList<RelatedTopic> relatedServices = null;
    // sonstiges
    Topic beschreibung = null;
    Topic contact = null;
    Topic opening_hours = null;
    Topic lor_nr = null;

    Logger log = Logger.getLogger(GeoObjectDetailsView.class.getName());

    public GeoObjectDetailsView(Topic geoObject, GeomapsService geomaps) {
        this.geoObjectView = new GeoObjectView(geoObject, geomaps);
        // related categories
        relatedTopics = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.criteria.thema", 0);
        relatedAudiences = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.criteria.zielgruppe", 0);
        relatedServices = geoObject.getRelatedTopics("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.criteria.angebot", 0);
        // fetch other details
        this.beschreibung = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
            "dm4.core.child", "ka2.beschreibung");
        this.contact = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
            "dm4.core.child", "ka2.kontakt");
        this.opening_hours = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
            "dm4.core.child", "ka2.oeffnungszeiten");
        this.lor_nr = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
            "dm4.core.child", "ka2.lor_nummer");
    }

    public JSONObject toJSON() {
        if (!geoObjectView.hasGeoCoordinateValues()) return null;
        try {
            JSONObject object = geoObjectView.toJSON();
            if (relatedTopics.getSize() > 0) {
                JSONArray related = new JSONArray();
                for (RelatedTopic relatedTopic : relatedTopics.getItems()) {
                    related.put(new JSONObject()
                            .put("related_topic_uri", relatedTopic.getUri())
                            .put("related_topic_name",
                                    relatedTopic.getSimpleValue().toString()));
                }
                object.put("related_topics", related);
            }
            object.put("address_name", geoObjectView.getAddressValue());
            object.put("geo_coordinate_id", geoObjectView.getGeoCoordinateTopicId());
            if (beschreibung != null) {
                object.put("beschreibung", beschreibung.getSimpleValue());
            }
            if (contact != null) {
                contact.loadChildTopics();
                // just telefon und fax
                object.put("kontakt", contact.getModel().toJSON());
            }
            if (opening_hours != null) {
                object.put("oeffnungszeiten", opening_hours.getSimpleValue());
            }
            if (lor_nr != null) {
                object.put("lor_id", lor_nr.getSimpleValue());
            }
            return object;
        } catch (Exception jex) {
            throw new RuntimeException("Constructing a JSON GeoObjectDetailsView FAILED", jex);
        }
    }

}
