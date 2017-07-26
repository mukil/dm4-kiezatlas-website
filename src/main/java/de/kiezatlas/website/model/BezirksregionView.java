package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.util.DeepaMehtaUtils;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;



public class BezirksregionView implements JSONEnabled {

    Topic bezirksregion;
    Topic bezirk;
    List<RelatedTopic> geoobjects;
    List<RelatedTopic> ansprechpartner;

    public BezirksregionView(Topic bezirksregion) {
        this.bezirksregion = bezirksregion;
    }

    public BezirksregionView(Topic bezirksregion, List<Topic> geoobject) {
        this.bezirksregion = bezirksregion;
        this.geoobjects = geoobjects;
    }

    public String getName() {
        return this.bezirksregion.getSimpleValue().toString();
    }

    public long getId() {
        return this.bezirksregion.getId();
    }

    public void setAnsprechpartner(List<RelatedTopic> usernames) {
        this.ansprechpartner = usernames;
    }

    public List<RelatedTopic> getAnsprechpartner() {
        return this.ansprechpartner;
    }

    public void setBezirk(Topic bezirk) {
        this.bezirk = bezirk;
    }

    public Topic getBezirk() {
        return this.bezirk;
    }

    public void setGeoObjects(List<RelatedTopic> geoobjects) {
        this.geoobjects = geoobjects;
    }

    public List<RelatedTopic> getGeoObjects() {
        return this.geoobjects;
    }

    public int getGeoObjectsSize() {
        return this.geoobjects.size();
    }

    @Override
    public JSONObject toJSON() {
        try {
            return new JSONObject()
                .put("topic", this.bezirksregion.toJSON())
                .put("bezirk", (this.bezirk == null) ? null : this.bezirk.toJSON())
                .put("ansprechpartner", (this.ansprechpartner == null) ? new ArrayList() : DeepaMehtaUtils.toJSONArray(this.ansprechpartner))
                .put("einrichtungen", (this.geoobjects == null) ? new ArrayList() : DeepaMehtaUtils.toJSONArray(this.geoobjects));
        } catch (JSONException ex) {
            Logger.getLogger(BezirksregionView.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }
    
}
