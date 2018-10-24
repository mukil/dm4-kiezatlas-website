package de.kiezatlas.website.migrations;

import de.deepamehta.core.Topic;
import de.deepamehta.core.service.Inject;
import de.deepamehta.core.service.Migration;
import de.deepamehta.workspaces.WorkspacesService;
import de.kiezatlas.angebote.AngebotService;
import java.util.List;
import java.util.logging.Logger;

/**
 * Remove geo objects for which users had not gathered consent.
 * @author malted
 */
public class Migration22 extends Migration {

    private Logger log = Logger.getLogger(getClass().getName());

    @Inject private WorkspacesService workspaces;
    @Inject private AngebotService angebote;

    @Override
    public void run() {
        log.info("### Migration 22 Started: Move Bild Path topics into Angebote workspace");
        List<Topic> bildPaths = dm4.getTopicsByType("ka2.bild.pfad");
        for (Topic pfad : bildPaths) {
            log.info("Moving Bild Pfad " + pfad.getSimpleValue()  + " Topic ID: " + pfad.getId() + " to new workspace");
            workspaces.assignToWorkspace(pfad, angebote.getAngeboteWorkspace().getId());
        }
        log.info("### Migration 22 Started: Move File Topics into Angebote workspace");
        List<Topic> files = dm4.getTopicsByType("dm4.files.file");
        for (Topic file : files) {
            log.info("Moving File Topic " + file.getSimpleValue()  + " Topic ID: " + file.getId() + " to new workspace");
            workspaces.assignToWorkspace(file, angebote.getAngeboteWorkspace().getId());
        }
        log.info("### Migration 22 COMPLETED: Move Bild Path topics into Angebote workspace");
    }

}
