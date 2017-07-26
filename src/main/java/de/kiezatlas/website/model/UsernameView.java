package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;



public class UsernameView implements JSONEnabled {

    Topic username;

    public UsernameView(Topic username) {
        if (username == null) throw new RuntimeException("Could not construct a UserView object "
            + "cause given Username is NULL");
        this.username = username;
    }

    public String getName() {
        return this.username.getSimpleValue().toString();
    }
    
    public long getId() {
        return this.username.getId();
    }

    @Override
    public String toString() {
        return getName();
    }

    @Override
    public JSONObject toJSON() {
        try {
            return new JSONObject()
                .put("name", getName())
                .put("id", getId());
        } catch (JSONException ex) {
            Logger.getLogger(UsernameView.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }

}
