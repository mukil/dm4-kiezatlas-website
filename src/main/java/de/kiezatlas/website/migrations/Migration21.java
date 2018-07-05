package de.kiezatlas.website.migrations;

import de.deepamehta.core.TopicType;
import de.deepamehta.core.model.IndexMode;
import de.deepamehta.core.service.Migration;
import java.util.logging.Logger;

/**
 * Add index modes to topic type "Bezirksregion".
 * @author malted
 */
public class Migration21 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());


    @Override
    public void run() {
        TopicType bezirksregion = dm4.getTopicType("ka2.bezirksregion");
        bezirksregion.addIndexMode(IndexMode.FULLTEXT);
        bezirksregion.addIndexMode(IndexMode.FULLTEXT_KEY);
        log.info("### Migration 21 COMPLETED: Added IndexMmode.FULLTEXT and FULLTEXT_KEY to topic type \""
                + bezirksregion.getSimpleValue() + "\"");
    }

}
