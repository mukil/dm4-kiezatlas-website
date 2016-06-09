package de.kiezatlas.website.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.plugins.geomaps.model.GeoCoordinate;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class EinrichtungsInfo implements JSONEnabled {
    
    public JSONObject json = null;

    public EinrichtungsInfo() {
        json = new JSONObject();
    }

    public void setName(String nameValue) {
        try {
            json.put("name", nameValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setAnsprechpartner(String kontaktValue) {
        try {
            json.put("ansprechpartner", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setTelefon(String kontaktValue) {
        try {
            json.put("telefon", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setFax(String kontaktValue) {
        try {
            json.put("fax", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setEmail(String kontaktValue) {
        try {
            json.put("email", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setOeffnungszeiten(String kontaktValue) {
        try {
            json.put("oeffnungszeiten", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setAddress(Topic address) {
        try {
            json.put("anschrift", address.getSimpleValue().toString()); // Utility
            setStrasse(address.getChildTopics().getString("dm4.contacts.street"));
            setPLZ(address.getChildTopics().getString("dm4.contacts.postal_code"));
            setCity(address.getChildTopics().getString("dm4.contacts.city"));
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setStrasse(String strasseValue) {
        try {
            json.put("strasse", strasseValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setPLZ(String plzValue) {
        try {
            json.put("plz", plzValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setCity(String cityValue) {
        try {
            json.put("city", cityValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setCountry(String countryValue) {
        try {
            json.put("country", countryValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setBezirk(String districtName) {
        try {
            json.put("bezirk", districtName);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setBezirkId(long id) {
        try {
            json.put("bezirk_id", id);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setWebpage(String webpageValue) {
        try {
            json.put("webpage", webpageValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setBeschreibung(String descriptionValue) {
        try {
            json.put("beschreibung", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setStichworte(String descriptionValue) {
        try {
            json.put("stichworte", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setLORId(String descriptionValue) {
        try {
            json.put("lor_nr", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setImprintUrl(String descriptionValue) {
        try {
            json.put("imprint", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setId(long id) {
        try {
            json.put("id", id);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setCoordinates(GeoCoordinate coordinate) {
        try {
            json.put("latitude", coordinate.lat);
            json.put("longitude", coordinate.lon);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setImageUrl(String path) {
        try {
            json.put("image_url", path);
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public JSONObject toJSON() {
        return json;
    }

    /** --------------------------- Thymeleaf Getter ----------------- */

    public String getName() {
        try {
            return json.getString("name");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "EinrichtungsInfo has no Name (Id:" + getId() + ")", ex);
            return "";
        }
    }

    public String getBeschreibung() {
        try {
            return json.getString("beschreibung");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Beschreibung (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getAnsprechpartner() {
        try {
            return json.getString("ansprechpartner");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Ansprechpartner (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getFax() {
        try {
            return json.getString("fax");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Fax (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getImageUrl() {
        try {
            return json.getString("image_url");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Image URL (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getEmail() {
        try {
            return json.getString("email");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has Email (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getTelefon() {
        try {
            return json.getString("telefon");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Telefon (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getImprint() {
        try {
            return json.getString("imprint");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Imprint (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getAddress() {
        try {
            return json.getString("anschrift");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getStrasse() {
        try {
            return json.getString("strasse");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getPlz() {
        try {
            return json.getString("plz");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getBezirk() {
        try {
            return json.getString("bezirk");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public long getBezirkId() {
        try {
            return json.getLong("bezirk_id");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return -1;
        }
    }

    public String getCity() {
        try {
            return json.getString("city");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getCountry() {
        try {
            return json.getString("country");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Anschrift (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getOeffnungszeiten() {
        try {
            return json.getString("oeffnungszeiten");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Öffnungszeiten (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public String getWebpage() {
        try {
            return json.getString("webpage");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Website (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getStichworte() {
        try {
            return json.getString("stichworte");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no Stichworte (Id: " + getId() + ")", ex);
            return "";
        }
    }
    
    public String getLor() {
        try {
            return json.getString("lor_nr");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.FINE, "Einrichtung has no LOR ID (Id: " + getId() + ")", ex);
            return "";
        }
    }

    public double getLongitude() {
        try {
            return json.getDouble("longitude");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.WARNING, "Einrichtung has no Longitude (Id: " + getId() + ")", ex);
            return 0.0;
        }
    }

    public double getLatitude() {
        try {
            return json.getDouble("latitude");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.WARNING, "Einrichtung has no Latitude (Id: " + getId() + ")", ex);
            return 0.0;
        }
    }

    public long getId() {
        try {
            return json.getLong("id");
        } catch (JSONException ex) {
            Logger.getLogger(EinrichtungsInfo.class.getName()).log(Level.SEVERE, null, ex);
        }
        return -1;
    }

    /** ------------------------- Java Object API Overrides --------------------- */
    
    @Override
    public boolean equals(Object obj) {
        boolean equal = false;
        if (obj instanceof EinrichtungsInfo) {
            equal = (this.getId() == ((EinrichtungsInfo) obj).getId());
        }
        return equal;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 29 * hash + (this.json != null ? this.json.hashCode() : 0);
        return hash;
    }

}
