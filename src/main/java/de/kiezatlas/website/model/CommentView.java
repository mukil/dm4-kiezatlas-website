/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class CommentView implements JSONEnabled {

    String message;
    String contact;

    public CommentView(String message, String contact) {
        this.message = message;
        this.contact = contact;
    }

    public void setMessage(String val) {
        this.message = val;
    }

    public void setContact(String val) {
        this.contact = val;
    }

    public String getMessage() {
        return message;
    }

    public String getContact() {
        return contact;
    }

    @Override
    public JSONObject toJSON() {
        try {
            return new JSONObject()
                .put("message", this.message)
                .put("contact", this.contact);
        } catch (JSONException ex) {
            Logger.getLogger(CommentView.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }
    
}
