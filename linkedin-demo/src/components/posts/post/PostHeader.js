import React from "react";
import Avatar from "@material-ui/core/Avatar";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import MoreHorizOutlinedIcon from "@material-ui/icons/MoreHorizOutlined";
import ReactTimeago from "react-timeago";

const PostHeader = ({
  classes,
  avatarSrc,
  displayName,
  timestamp,
  isEdited,
  canNavigateProfile,
  onProfileClick,
  onEditedBadgeClick,
  canShowPostMenu,
  onMenuOpen,
  menuAnchorEl,
  isMenuOpen,
  onMenuClose,
  isOwnPost,
  onEditClick,
  onDeleteClick,
  onReportClick,
  hasReportedPost,
  isReportSubmitting,
}) => (
  <div className={classes.post__header}>
    <Avatar
      src={avatarSrc}
      onClick={canNavigateProfile ? onProfileClick : undefined}
      style={canNavigateProfile ? { cursor: "pointer" } : undefined}
    />
    <div className={classes.header__info}>
      <h4
        onClick={canNavigateProfile ? onProfileClick : undefined}
        style={canNavigateProfile ? { cursor: "pointer" } : { cursor: "default" }}
      >
        {displayName}
      </h4>
      <div className={classes.header__meta}>
        <p>
          <ReactTimeago date={new Date(timestamp).toUTCString()} units="minute" />
        </p>
        {isEdited && (
          <button
            type="button"
            className={classes.editedBadge}
            onClick={onEditedBadgeClick}
            aria-label="View edit history"
          >
            Edited
          </button>
        )}
      </div>
    </div>
    {canShowPostMenu && (
      <>
        <MoreHorizOutlinedIcon onClick={onMenuOpen} />
        <Menu anchorEl={menuAnchorEl} keepMounted open={isMenuOpen} onClose={onMenuClose}>
          {isOwnPost ? (
            <>
              <MenuItem onClick={onEditClick}>Edit</MenuItem>
              <MenuItem onClick={onDeleteClick}>Delete</MenuItem>
            </>
          ) : (
            <MenuItem onClick={onReportClick} disabled={hasReportedPost || isReportSubmitting}>
              {hasReportedPost ? "Reported" : "Report"}
            </MenuItem>
          )}
        </Menu>
      </>
    )}
  </div>
);

export default PostHeader;
