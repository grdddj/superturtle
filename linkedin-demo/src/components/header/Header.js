import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@material-ui/core/styles";
import { ChangeTheme } from "../../store/actions/util";
import {
  Paper,
  Avatar,
  Badge,
  Button,
  ClickAwayListener,
  Typography,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import HomeIcon from "@material-ui/icons/Home";
import HomeOutlinedIcon from "@material-ui/icons/HomeOutlined";
import PeopleAltIcon from "@material-ui/icons/PeopleAlt";
import NotificationsIcon from "@material-ui/icons/Notifications";
import NotificationsOutlinedIcon from "@material-ui/icons/NotificationsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ForumIcon from "@material-ui/icons/Forum";
import ForumOutlinedIcon from "@material-ui/icons/ForumOutlined";
import NightsStayOutlinedIcon from "@material-ui/icons/NightsStayOutlined";
import WbSunnyOutlinedIcon from "@material-ui/icons/WbSunnyOutlined";
import PersonIcon from "@material-ui/icons/Person";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import BusinessIcon from "@material-ui/icons/Business";
import VerifiedUserIcon from "@material-ui/icons/VerifiedUser";
import { api } from "../../convex/_generated/api";
import useConvexUser from "../../hooks/useConvexUser";
import MenuItem from "./menuItem/MenuItem";
import Style from "./Style";

const Header = ({
  activeTab,
  setActiveTab,
  onNavigateProfile,
  onNavigateHome,
}) => {
  const classes = Style();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector((state) => state.util);
  const authActions = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const signOut = authActions?.signOut ?? (() => Promise.resolve());
  const user = useConvexUser();
  const photoURL = user?.photoURL;
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    isAuthenticated && user?._id ? { userId: user._id } : "skip"
  );
  const users = useQuery(
    api.users.searchUsers,
    debouncedTerm ? { query: debouncedTerm } : "skip"
  );
  const posts = useQuery(
    api.posts.searchPosts,
    debouncedTerm ? { query: debouncedTerm } : "skip"
  );
  const companies = useQuery(
    api.companies.searchCompanies,
    debouncedTerm ? { query: debouncedTerm } : "skip"
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const userResults = users ?? [];
  const postResults = posts ?? [];
  const companyResults = companies ?? [];
  const showSearchResults = isSearchOpen && searchTerm.trim().length > 0;
  const isSearchLoading =
    Boolean(debouncedTerm) &&
    (users === undefined || posts === undefined || companies === undefined);

  const getDescriptionSnippet = (description = "") => {
    if (description.length <= 60) {
      return description;
    }

    return `${description.slice(0, 60)}...`;
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const getFollowerLabel = (count) => {
    if (count === 1) {
      return "1 follower";
    }
    return `${count} followers`;
  };

  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedTerm("");
    closeSearch();
  };

  const handleSearchChange = (event) => {
    const nextTerm = event.target.value;
    setSearchTerm(nextTerm);
    setIsSearchOpen(nextTerm.trim().length > 0);
  };

  const handleSearchFocus = () => {
    if (searchTerm.trim().length > 0) {
      setIsSearchOpen(true);
    }
  };

  const handleResultKeyDown = (event, onActivate) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  const handleUserResultClick = (resultUser) => {
    onNavigateProfile({
      username: resultUser?.username ?? null,
      userId: resultUser?._id ?? null,
    });
    clearSearch();
  };

  const handlePostResultClick = (postId) => {
    if (typeof onNavigateHome === "function") {
      onNavigateHome();
    } else {
      setActiveTab("home");
    }
    clearSearch();

    window.setTimeout(() => {
      const postElement = document.getElementById(`post-${postId}`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleCompanyResultClick = (slug) => {
    if (!slug) {
      return;
    }

    navigate(`/company/${encodeURIComponent(slug)}`);
    clearSearch();
  };

  const isHomeActive = activeTab === "home";
  const isNetworkActive = activeTab === "network";
  const isMessagingActive = activeTab === "messaging";
  const isNotificationsActive = activeTab === "notifications";
  const notificationsNavIcon = isNotificationsActive ? (
    <NotificationsIcon />
  ) : (
    <NotificationsOutlinedIcon />
  );

  const items = [
    {
      key: "home",
      Icon: isHomeActive ? <HomeIcon /> : <HomeOutlinedIcon />,
      title: "Home",
      arrow: false,
      onClick: () => setActiveTab("home"),
      isActive: isHomeActive,
    },
    {
      key: "network",
      Icon: <PeopleAltOutlinedIcon />,
      title: "My Network",
      arrow: false,
      onClick: () => setActiveTab("network"),
      isActive: isNetworkActive,
    },
    {
      key: "messaging",
      Icon: <ForumOutlinedIcon />,
      title: "Messaging",
      arrow: false,
      onClick: () => setActiveTab("messaging"),
      isActive: isMessagingActive,
    },
    {
      key: "notifications",
      Icon: isAuthenticated ? (
        <Badge
          color="primary"
          badgeContent={unreadCount ?? 0}
          invisible={!unreadCount}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {notificationsNavIcon}
        </Badge>
      ) : (
        notificationsNavIcon
      ),
      title: "Notifications",
      arrow: false,
      onClick: () => setActiveTab("notifications"),
      isActive: isNotificationsActive,
    },
    {
      key: "profile",
      Icon: <Avatar src={photoURL} />,
      title: "Me",
      arrow: true,
      onClick: () =>
        onNavigateProfile({
          username: user?.username ?? null,
          userId: user?._id ?? null,
        }),
      isActive: false,
    },
  ];

  const navigateToHome = () => {
    if (typeof onNavigateHome === "function") {
      onNavigateHome();
      return;
    }
    setActiveTab("home");
  };

  const tabItems = [
    {
      key: "home",
      icon: activeTab === "home" ? HomeIcon : HomeOutlinedIcon,
      onClick: navigateToHome,
      isActive: activeTab === "home",
    },
    {
      key: "network",
      icon: activeTab === "network" ? PeopleAltIcon : PeopleAltOutlinedIcon,
      onClick: () => setActiveTab("network"),
      isActive: activeTab === "network",
    },
    {
      key: "messaging",
      icon: activeTab === "messaging" ? ForumIcon : ForumOutlinedIcon,
      onClick: () => setActiveTab("messaging"),
      isActive: activeTab === "messaging",
    },
    {
      key: "notifications",
      icon:
        activeTab === "notifications"
          ? NotificationsIcon
          : NotificationsOutlinedIcon,
      onClick: () => setActiveTab("notifications"),
      isActive: activeTab === "notifications",
    },
    {
      key: "profile",
      icon: activeTab === "profile" ? PersonIcon : PersonOutlineIcon,
      onClick: () =>
        onNavigateProfile({
          username: user?.username ?? null,
          userId: user?._id ?? null,
        }),
      isActive: false,
    },
  ];

  return (
    <Paper elevation={0} className={classes.header}>
      <div className={classes.header__container}>
        <div className={classes.header__logo}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              cursor: "pointer",
            }}
            onClick={navigateToHome}
          >
            <img src="/turtle-mascot.png" alt="TurtleIn" style={{ height: 28 }} />
            <span style={{
              color: theme.palette.primary.main,
              fontSize: 22,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}>TurtleIn</span>
          </span>
          <ClickAwayListener onClickAway={closeSearch}>
            <div className={classes.search__wrapper}>
              <div className={classes.search}>
                <SearchIcon />
                <input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                />
              </div>
              {showSearchResults && (
                <Paper className={classes.searchDropdown} elevation={3}>
                  {isSearchLoading ? (
                    <Typography className={classes.searchEmptyState}>Searching...</Typography>
                  ) : (
                    <>
                      <Typography className={classes.searchSectionHeader}>Users</Typography>
                      {userResults.length > 0 ? (
                        userResults.map((resultUser) => (
                          <div
                            key={resultUser._id}
                            className={classes.searchResultItem}
                            onClick={() => handleUserResultClick(resultUser)}
                            onKeyDown={(event) =>
                              handleResultKeyDown(event, () =>
                                handleUserResultClick(resultUser)
                              )
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <Avatar
                              src={resultUser.photoURL}
                              alt={resultUser.displayName}
                              className={classes.searchResultAvatar}
                            />
                            <div className={classes.searchResultContent}>
                              <Typography className={classes.searchResultPrimary}>
                                {resultUser.displayName}
                              </Typography>
                              <Typography className={classes.searchResultSecondary}>
                                {resultUser.title}
                              </Typography>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Typography className={classes.searchEmptyState}>
                          No users found.
                        </Typography>
                      )}

                      <Typography className={classes.searchSectionHeader}>Posts</Typography>
                      {postResults.length > 0 ? (
                        postResults.map((post) => (
                          <div
                            key={post._id}
                            className={classes.searchResultItem}
                            onClick={() => handlePostResultClick(post._id)}
                            onKeyDown={(event) =>
                              handleResultKeyDown(event, () =>
                                handlePostResultClick(post._id)
                              )
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <div className={classes.searchResultContent}>
                              <Typography className={classes.searchResultPrimary}>
                                {post.author?.displayName ?? "Unknown user"}
                              </Typography>
                              <Typography className={classes.searchResultSecondary}>
                                {getDescriptionSnippet(post.description)}
                              </Typography>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Typography className={classes.searchEmptyState}>
                          No posts found.
                        </Typography>
                      )}

                      <Typography className={classes.searchSectionHeader}>Companies</Typography>
                      {companyResults.length > 0 ? (
                        companyResults.map((company) => (
                          <div
                            key={company.slug}
                            className={classes.searchResultItem}
                            onClick={() => handleCompanyResultClick(company.slug)}
                            onKeyDown={(event) =>
                              handleResultKeyDown(event, () =>
                                handleCompanyResultClick(company.slug)
                              )
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <Avatar
                              src={company.logoURL ?? undefined}
                              alt={company.name}
                              className={classes.searchResultAvatar}
                            >
                              {!company.logoURL ? <BusinessIcon fontSize="small" /> : null}
                            </Avatar>
                            <div className={classes.searchResultContent}>
                              <div className={classes.searchResultPrimaryRow}>
                                <Typography className={classes.searchResultPrimary}>
                                  {company.name}
                                </Typography>
                                {company.isVerified ? (
                                  <VerifiedUserIcon
                                    className={classes.searchVerifiedIcon}
                                    aria-label="Verified company"
                                  />
                                ) : null}
                              </div>
                              <Typography className={classes.searchResultSecondary}>
                                {`${company.industry || "Unknown industry"} • ${getFollowerLabel(
                                  company.followerCount
                                )}`}
                              </Typography>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Typography className={classes.searchEmptyState}>
                          No companies found.
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              )}
            </div>
          </ClickAwayListener>
          <Avatar
            src={photoURL}
            onClick={() =>
              onNavigateProfile({
                username: user?.username ?? null,
                userId: user?._id ?? null,
              })
            }
            style={{ cursor: "pointer" }}
          />
        </div>
        <div className={classes.header__nav}>
          {items.map(({ key, Icon, title, arrow, onClick, isActive }) => (
            <div
              key={key}
              className={`${classes.headerNavItem} ${
                isActive ? classes.headerNavItemActive : ""
              }`}
            >
              <MenuItem Icon={Icon} title={title} arrow={arrow} onClick={onClick} />
            </div>
          ))}
          <div className={classes.headerNavItem}>
            <MenuItem
              Icon={mode ? <NightsStayOutlinedIcon /> : <WbSunnyOutlinedIcon />}
              title={"Theme"}
              onClick={() => dispatch(ChangeTheme())}
            />
          </div>
        </div>
        <Button className={classes.signOutButton} onClick={() => signOut()} variant="outlined">
          Sign Out
        </Button>
        <Paper className={classes.header__bottom__nav}>
          {tabItems.map(({ key, icon: Icon, onClick, isActive }) => (
            <Icon
              key={key}
              onClick={onClick}
              aria-label={key}
              className={`${classes.bottomNavIcon} ${
                isActive ? classes.bottomNavIconActive : ""
              }`}
            />
          ))}
        </Paper>
      </div>
    </Paper>
  );
};

export default Header;
