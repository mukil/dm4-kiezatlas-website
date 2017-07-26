package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;



public class UserView implements JSONEnabled {

    Topic username;
    List<EinrichtungView> geoobjects;
    List<BezirkView> bezirke;
    List<BezirksregionView> bezirksregionen;
    List<Topic> workspaces;

    public UserView(Topic username) {
        if (username == null) throw new RuntimeException("Could not construct a UserView object "
            + "cause given Username is NULL");
        this.username = username;
    }

    public List<RelatedTopic> getBezirke() {
        // List<RelatedTopic> bezirke =
        return this.username.getRelatedTopics("dm4.core.association", "dm4.core.default", "dm4.core.default", "ka2.bezirk");
    }

    public List<RelatedTopic> getBezirksregionen() {
        // List<BezirksregionView>
        return this.username.getRelatedTopics("dm4.core.association", "dm4.core.default", "dm4.core.default", "ka2.bezirksregion");
    }

    public List<RelatedTopic> getEinrichtungen() {
        // List<EinrichtungView>
        return this.username.getRelatedTopics("de.kiezatlas.user_assignment", "dm4.core.default", "dm4.core.default", "ka2.geo_object");
    }

    public List<RelatedTopic> getMemberships() {
        return this.username.getRelatedTopics("dm4.accesscontrol.membership", "dm4.core.default", "dm4.core.default", "dm4.workspaces.workspace");
        // return this.workspaces;
    }

    @Override
    public JSONObject toJSON() {
        try {
            return new JSONObject()
                .put("username", this.username.getSimpleValue().toString())
                .put("username_id", this.username.getId())
                .put("bezirke", getBezirke())
                .put("bezirksregionen", getBezirksregionen())
                .put("einrichtungen", getEinrichtungen())
                .put("workspaces", getMemberships());
        } catch (JSONException ex) {
            Logger.getLogger(UserView.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }

}
