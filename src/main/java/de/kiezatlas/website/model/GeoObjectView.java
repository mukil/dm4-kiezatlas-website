package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import de.deepamehta.plugins.geomaps.GeomapsService;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 * A data-transfer object wrapping a <code>Geo Object</code> displayable on a map.<br/>
 * Used as index to more detailed data.
 *
 * @author Malte Reißig (<a href="mailto:malte@mikromedia.de">Contact</a>)
 */
public class GeoObjectView implements JSONEnabled {

    Topic geoObject = null;
    // location
    GeoCoordinate geoCoordinate = null;
    long geoCoordTopicId = -1;
    //
    Topic bezirk = null;
    Topic bezirksregion = null;
    Topic addressTopic = null;

    Logger log = Logger.getLogger(GeoObjectView.class.getName());

    public GeoObjectView(Topic geoObject, GeomapsService geomaps) {
        this.geoObject = geoObject;
        getGeoCoordinate(geomaps);
    }

    public String getName() {
        return this.geoObject.getSimpleValue().toString();
    }

    public Topic getBezirksregion() {
        bezirksregion = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
                "dm4.core.child", "ka2.bezirksregion"); // ### many?
        if (bezirksregion == null) {
            log.log(Level.WARNING, "### Geo Object ({0}, {1}) has no BEZIRKSREGION set!",
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
            return null;
        }
        return bezirksregion;
    }

    public Topic getBezirk() {
        bezirk = geoObject.getRelatedTopic("dm4.core.aggregation", "dm4.core.parent",
                "dm4.core.child", "ka2.bezirk");
        if (bezirk == null) {
            log.log(Level.WARNING, "### Geo Object ({0}, {1}) has no BEZIRK set!",
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
            return null;
        }
        return bezirk;
    }

    public GeoCoordinate getGeoCoordinate(GeomapsService geomaps) {
        // fetch geo-coordinate via address
        addressTopic = geoObject.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
                "dm4.core.child", "dm4.contacts.address");
        if (addressTopic != null) {
            Topic geoCoordTopic = addressTopic.getRelatedTopic("dm4.core.composition", "dm4.core.parent",
                    "dm4.core.child", "dm4.geomaps.geo_coordinate");
            if (geoCoordTopic != null) {
                geoCoordTopicId = geoCoordTopic.getId();
                addressTopic.loadChildTopics();
                return geoCoordinate = geomaps.geoCoordinate(geoCoordTopic);
            } else {
                log.log(Level.WARNING, "### Geo Object's Address (" + addressTopic.getId() + "," + geoObject
                        .getSimpleValue() +") has no GEO COORDINATE set!");
            }
        } else {
            log.log(Level.WARNING, "### Geo Object ({0}, {1}) has no ADDRESS set!",
                    new Object[]{geoObject.getUri(), geoObject.getSimpleValue()});
        }
        return null;
    }

    public long getGeoCoordinateTopicId() {
        return geoCoordTopicId;
    }

    public double getGeoCoordinateLatValue() {
        return (geoCoordinate != null) ? geoCoordinate.lat : -1000;
    }

    public double getGeoCoordinateLngValue() {
        return (geoCoordinate != null) ? geoCoordinate.lon : -1000;
    }

    public String getAggregatedAddressTopicId() {
        if (addressTopic == null) return "-1:-1";
        return addressTopic.getChildTopics().getTopic("dm4.contacts.street").getId() + ":" +
                addressTopic.getChildTopics().getTopic("dm4.contacts.postal_code").getId();
    }

    public String getAddressValue() {
        if (addressTopic == null) return "";
        return addressTopic.getSimpleValue().toString();
    }

    public String getBezirkUri() {
        return (bezirk != null) ? bezirk.getUri() : "";
    }

    public String getBezirkName() {
        return (bezirk != null) ? bezirk.getSimpleValue().toString() : "";
    }

    public String getBezirksregionUri() {
        return (bezirksregion != null) ? bezirksregion.getUri() : "";
    }

    public String getBezirksregionName() {
        return (bezirksregion != null) ? bezirksregion.getSimpleValue().toString() : "";
    }

    public boolean hasGeoCoordinateValues() {
        return (getGeoCoordinateLatValue() == -1000 || getGeoCoordinateLngValue() == -1000) ? false : true;
    }

    public JSONObject toJSON() {
        // needed to display geo object
        if (!hasGeoCoordinateValues()) return null;
        // needed to link into orginal citymap
        getBezirk();
        getBezirksregion(); // has stadtplan web alias in uri
        // return valid object
        try {
            return new JSONObject()
                    .put("uri", geoObject.getUri())
                    .put("id", geoObject.getId())
                    .put("name", getName())
                    .put("address_id", getAggregatedAddressTopicId())
                    .put("geo_coordinate_lat", getGeoCoordinateLatValue())
                    .put("geo_coordinate_lon", getGeoCoordinateLngValue())
                    .put("bezirk_uri", getBezirkUri())
                    .put("bezirk_name", getBezirkName())
                    .put("bezirksregion_uri", getBezirksregionUri())
                    .put("bezirksregion_name", getBezirksregionName());
        } catch (Exception jex) {
            throw new RuntimeException("Constructing a JSON GeoObjectView FAILED", jex);
        }
    }

}
